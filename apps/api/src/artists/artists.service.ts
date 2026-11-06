import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ApplyArtistDto } from './dto/apply-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private trackSelect = {
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
  } as const;

  private async mapTrack(t: {
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
  }) {
    return {
      id: t.id,
      title: t.title,
      slug: t.slug,
      artistId: t.artistProfileId,
      artistName: t.artistProfile.stageName,
      coverImageUrl: await this.storageService.resolveCoverUrl(t.coverImageUrl),
      durationSeconds: t.durationSeconds ?? undefined,
      playCount: Number(t.playCount),
      likeCount: t.likeCount,
      explicit: t.explicit,
      releaseDate: t.releaseDate?.toISOString() ?? undefined,
      genreId: t.genreId ?? undefined,
      status: t.status,
    };
  }

  async apply(userId: string, dto: ApplyArtistDto) {
    const existing = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('User already has an artist profile');
    }

    const [profile] = await this.prisma.$transaction([
      this.prisma.artistProfile.create({
        data: {
          userId,
          stageName: dto.stageName,
          bio: dto.bio,
          verificationStatus: 'PENDING',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: 'ARTIST' },
      }),
    ]);

    return profile;  }

  async findById(id: string) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { id },
    });
    if (!artist) throw new NotFoundException('Artist not found');

    const recentTracks = await this.prisma.track.findMany({
      where: { artistProfileId: id, status: 'PUBLISHED' },
      orderBy: { releaseDate: 'desc' },
      take: 6,
      select: this.trackSelect,
    });

    const topTracks = await this.prisma.track.findMany({
      where: { artistProfileId: id, status: 'PUBLISHED' },
      orderBy: { playCount: 'desc' },
      take: 6,
      select: this.trackSelect,
    });

    return {
      id: artist.id,
      stageName: artist.stageName,
      bio: artist.bio ?? undefined,
      imageUrl: artist.imageUrl ?? undefined,
      headerImageUrl: artist.headerImageUrl ?? undefined,
      country: artist.country ?? undefined,
      websiteUrl: artist.websiteUrl ?? undefined,
      totalFollowers: artist.totalFollowers,
      totalTracks: artist.totalTracks,
      isVerified: artist.isVerified,
      verificationStatus: artist.verificationStatus,
      recentTracks: await Promise.all(recentTracks.map((t) => this.mapTrack(t))),
      topTracks: await Promise.all(topTracks.map((t) => this.mapTrack(t))),
    };
  }

  async getMyProfile(userId: string) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });
    if (!artist) throw new NotFoundException('Artist profile not found');
    return artist;
  }

  async updateMyProfile(userId: string, dto: UpdateArtistDto) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });
    if (!artist) throw new NotFoundException('Artist profile not found');

    return this.prisma.artistProfile.update({
      where: { id: artist.id },
      data: {
        bio: dto.bio,
        imageUrl: dto.imageUrl,
        headerImageUrl: dto.headerImageUrl,
        websiteUrl: dto.websiteUrl,
        socialLinks: dto.socialLinks as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async followArtist(userId: string, artistId: string) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { id: artistId },
    });
    if (!artist) throw new NotFoundException('Artist not found');

    // Check if already following — only create and increment when the row is new
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingArtistId: { followerId: userId, followingArtistId: artistId } },
    });
    if (existing) {
      return { message: 'Already following artist' };
    }

    await this.prisma.$transaction([
      this.prisma.follow.create({
        data: { followerId: userId, followingArtistId: artistId },
      }),
      this.prisma.artistProfile.update({
        where: { id: artistId },
        data: { totalFollowers: { increment: 1 } },
      }),
    ]);

    return { message: 'Following artist' };
  }

  async unfollowArtist(userId: string, artistId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingArtistId: { followerId: userId, followingArtistId: artistId } },
    });
    if (!follow) throw new NotFoundException('Not following this artist');

    await this.prisma.$transaction([
      this.prisma.follow.delete({
        where: { followerId_followingArtistId: { followerId: userId, followingArtistId: artistId } },
      }),
      this.prisma.artistProfile.update({
        where: { id: artistId },
        data: {
          totalFollowers: {
            decrement: 1,
          },
        },
      }),
    ]);

    return { message: 'Unfollowed artist' };
  }

  async getFollowers(artistId: string, cursor?: string, limit = 20) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { id: artistId },
    });
    if (!artist) throw new NotFoundException('Artist not found');

    // Decode the opaque cursor back to the internal followerId
    const decodedCursor = cursor
      ? Buffer.from(cursor, 'base64').toString('utf8')
      : undefined;

    const follows = await this.prisma.follow.findMany({
      where: { followingArtistId: artistId },
      take: limit + 1,
      ...(decodedCursor
        ? {
            cursor: {
              followerId_followingArtistId: {
                followerId: decodedCursor,
                followingArtistId: artistId,
              },
            },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } },
        },
      },
    });

    const hasNext = follows.length > limit;
    const items = hasNext ? follows.slice(0, limit) : follows;
    // Encode the internal followerId as base64 so it is opaque in the public API
    const nextCursor = hasNext
      ? Buffer.from(items[items.length - 1]!.followerId, 'utf8').toString('base64')
      : undefined;

    return {
      items: items.map((f) => ({
        userId: f.follower.id,
        username: f.follower.username,
        displayName: f.follower.profile?.displayName ?? undefined,
        avatarUrl: f.follower.profile?.avatarUrl ?? undefined,
        followedAt: f.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
