import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const genres = await this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });

    const counts = await Promise.all(
      genres.map((g) =>
        this.prisma.track.count({
          where: { genreId: g.id, status: 'PUBLISHED' },
        }),
      ),
    );

    return genres.map((g, i) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description ?? undefined,
      imageUrl: g.imageUrl ?? undefined,
      trackCount: counts[i],
    }));
  }

  async findBySlug(slug: string, cursor?: string, limit = 20) {
    const genre = await this.prisma.genre.findUnique({ where: { slug } });
    if (!genre) throw new NotFoundException(`Genre '${slug}' not found`);

    const trackCount = await this.prisma.track.count({
      where: { genreId: genre.id, status: 'PUBLISHED' },
    });

    const tracks = await this.prisma.track.findMany({
      where: { genreId: genre.id, status: 'PUBLISHED' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
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
      },
    });

    const hasNext = tracks.length > limit;
    const items = hasNext ? tracks.slice(0, limit) : tracks;
    const nextCursor = hasNext ? items[items.length - 1]?.id : undefined;

    return {
      genre: {
        id: genre.id,
        name: genre.name,
        slug: genre.slug,
        description: genre.description ?? undefined,
        imageUrl: genre.imageUrl ?? undefined,
        trackCount,
      },
      tracks: items.map((t) => ({
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
        status: t.status,
      })),
      nextCursor,
    };
  }
}
