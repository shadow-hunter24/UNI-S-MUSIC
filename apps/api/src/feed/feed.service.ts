import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(userId?: string) {
    const [trendingRaw, newReleasesRaw, genres] = await Promise.all([
      this.prisma.track.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { playCount: 'desc' },
        take: 10,
        select: TRACK_SELECT,
      }),
      this.prisma.track.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { releaseDate: 'desc' },
        take: 10,
        select: TRACK_SELECT,
      }),
      this.prisma.genre.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const byGenre = await Promise.all(
      genres.map(async (g) => {
        const tracks = await this.prisma.track.findMany({
          where: { genreId: g.id, status: 'PUBLISHED' },
          orderBy: { playCount: 'desc' },
          take: 4,
          select: TRACK_SELECT,
        });
        return {
          genre: { id: g.id, name: g.name, slug: g.slug, imageUrl: g.imageUrl ?? undefined },
          tracks: tracks.map(mapTrack),
        };
      }),
    );

    let fromFollowing: ReturnType<typeof mapTrack>[] | undefined;
    if (userId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingArtistId: true },
      });

      if (follows.length > 0) {
        const artistIds = follows.map((f) => f.followingArtistId);
        const followingTracks = await this.prisma.track.findMany({
          where: {
            artistProfileId: { in: artistIds },
            status: 'PUBLISHED',
          },
          orderBy: { releaseDate: 'desc' },
          take: 10,
          select: TRACK_SELECT,
        });
        fromFollowing = followingTracks.map(mapTrack);
      }
    }

    return {
      trending: trendingRaw.map(mapTrack),
      newReleases: newReleasesRaw.map(mapTrack),
      byGenre: byGenre.filter((g) => g.tracks.length > 0),
      fromFollowing,
    };
  }

  async getTrending(limit = 20) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const tracks = await this.prisma.track.findMany({
      where: {
        status: 'PUBLISHED',
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
      select: TRACK_SELECT,
    });

    if (tracks.length < limit) {
      const allTime = await this.prisma.track.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { playCount: 'desc' },
        take: limit,
        select: TRACK_SELECT,
      });
      return allTime.map(mapTrack);
    }

    return tracks.map(mapTrack);
  }

  async getNewReleases(limit = 20) {
    const tracks = await this.prisma.track.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { releaseDate: 'desc' },
      take: limit,
      select: TRACK_SELECT,
    });
    return tracks.map(mapTrack);
  }
}
