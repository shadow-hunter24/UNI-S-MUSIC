import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TracksQueryDto } from './dto/tracks-query.dto';
import { Prisma } from '@prisma/client';

const TRACK_SELECT = {
  id: true,
  title: true,
  slug: true,
  artistProfileId: true,
  coverImageUrl: true,
  durationSeconds: true,
  playCount: true,
  likeCount: true,
  explicit: true,
  releaseDate: true,
  genreId: true,
  status: true,
  artistProfile: { select: { stageName: true } },
  genre: { select: { name: true } },
} as const;

function mapTrack(t: {
  id: string;
  title: string;
  slug: string;
  artistProfileId: string;
  coverImageUrl: string | null;
  durationSeconds: number | null;
  playCount: bigint;
  likeCount: number;
  explicit: boolean;
  releaseDate: Date | null;
  genreId: string | null;
  status: string;
  artistProfile: { stageName: string };
  genre: { name: string } | null;
}) {
  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    artistId: t.artistProfileId,
    artistName: t.artistProfile.stageName,
    coverImageUrl: t.coverImageUrl ?? undefined,
    durationSeconds: t.durationSeconds ?? undefined,
    playCount: Number(t.playCount),
    likeCount: t.likeCount,
    explicit: t.explicit,
    releaseDate: t.releaseDate?.toISOString() ?? undefined,
    genreId: t.genreId ?? undefined,
    genreName: t.genre?.name ?? undefined,
    status: t.status,
  };
}

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedTracks(query: TracksQueryDto) {
    const limit = query.limit ?? 20;

    const where: Prisma.TrackWhereInput = { status: 'PUBLISHED' };

    if (query.genre) {
      const genre = await this.prisma.genre.findUnique({ where: { slug: query.genre } });
      if (genre) where.genreId = genre.id;
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    let orderBy: Prisma.TrackOrderByWithRelationInput;
    switch (query.sort) {
      case 'trending':
        orderBy = { playCount: 'desc' };
        break;
      case 'popular':
        orderBy = { likeCount: 'desc' };
        break;
      case 'recent':
      default:
        orderBy = { releaseDate: 'desc' };
        break;
    }

    const tracks = await this.prisma.track.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy,
      select: TRACK_SELECT,
    });

    const hasNext = tracks.length > limit;
    const items = hasNext ? tracks.slice(0, limit) : tracks;
    const nextCursor = hasNext ? items[items.length - 1]?.id : undefined;

    return {
      items: items.map(mapTrack),
      nextCursor,
    };
  }

  async getTrackById(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      select: {
        ...TRACK_SELECT,
        credits: {
          select: { id: true, role: true, name: true, userId: true },
        },
      },
    });

    if (!track || track.status !== 'PUBLISHED') {
      throw new NotFoundException('Track not found');
    }

    return {
      ...mapTrack(track),
      credits: track.credits,
    };
  }

  async likeTrack(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.status !== 'PUBLISHED') {
      throw new NotFoundException('Track not found');
    }

    const existing = await this.prisma.like.findUnique({
      where: { userId_trackId: { userId, trackId } },
    });
    if (existing) throw new ConflictException('Track already liked');

    await this.prisma.$transaction([
      this.prisma.like.create({ data: { userId, trackId } }),
      this.prisma.track.update({
        where: { id: trackId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    return { liked: true };
  }

  async unlikeTrack(userId: string, trackId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_trackId: { userId, trackId } },
    });
    if (!existing) throw new NotFoundException('Like not found');

    await this.prisma.$transaction([
      this.prisma.like.delete({ where: { userId_trackId: { userId, trackId } } }),
      this.prisma.track.update({
        where: { id: trackId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    return { liked: false };
  }

  async isLiked(userId: string, trackId: string): Promise<{ liked: boolean }> {
    const like = await this.prisma.like.findUnique({
      where: { userId_trackId: { userId, trackId } },
    });
    return { liked: !!like };
  }
}
