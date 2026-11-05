import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const [tracks, artists, genres] = await Promise.all([
      this.searchTracks(q),
      this.searchArtists(q),
      this.searchGenres(q),
    ]);

    return { tracks, artists, genres };
  }

  async searchTracks(q: string) {
    const tracks = await this.prisma.track.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { playCount: 'desc' },
      select: {
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
      },
    });

    return tracks.map((t) => ({
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
    }));
  }

  async searchArtists(q: string) {
    return this.prisma.artistProfile.findMany({
      where: { stageName: { contains: q, mode: 'insensitive' } },
      take: 10,
      select: {
        id: true,
        stageName: true,
        bio: true,
        imageUrl: true,
        isVerified: true,
        totalFollowers: true,
        totalTracks: true,
        verificationStatus: true,
      },
    });
  }

  async searchGenres(q: string) {
    return this.prisma.genre.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
      },
    });
  }
}
