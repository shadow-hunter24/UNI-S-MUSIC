import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, AUDIO_MIME_TYPES, COVER_MIME_TYPES, AUDIO_MAX_BYTES, COVER_MAX_BYTES } from '../storage/storage.service';
import { AudioQueueService } from '../queue/audio-queue.service';
import { TracksQueryDto } from './dto/tracks-query.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { AddCreditDto } from './dto/add-credit.dto';
import { RejectTrackDto } from './dto/reject-track.dto';
import { RecordPlayDto } from './dto/record-play.dto';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

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
  processingError: true,
  processedAt: true,
  audioUrl: true,
  artistProfile: { select: { stageName: true } },
  genre: { select: { name: true } },
} as const;

type TrackSelectResult = {
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
  processingError: string | null;
  processedAt: Date | null;
  audioUrl: string | null;
  artistProfile: { stageName: string };
  genre: { name: string } | null;
};

@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly audioQueueService: AudioQueueService,
  ) {}

  private async mapTrack(t: TrackSelectResult) {
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
      genreName: t.genre?.name ?? undefined,
      status: t.status,
      processingError: t.processingError ?? undefined,
      streamUrl: t.status === 'PUBLISHED' ? `/api/v1/tracks/${t.id}/stream` : undefined,
      // audioUrl intentionally omitted from response
    };
  }

  private async assertOwnsTrack(userId: string, trackId: string) {
    const t = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { artistProfile: { select: { userId: true } } },
    });
    if (!t) throw new NotFoundException('Track not found');
    if (t.artistProfile.userId !== userId) throw new ForbiddenException('Not your track');
  }

  private generateSlug(title: string): string {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base}-${randomUUID().slice(0, 6)}`;
  }

  async getPublishedTracks(query: TracksQueryDto) {
    const limit = query.limit ?? 20;

    const where: Prisma.TrackWhereInput = { status: 'PUBLISHED' };

    if (query.genre) {
      const genre = await this.prisma.genre.findUnique({ where: { slug: query.genre } });
      if (!genre) throw new NotFoundException('Genre not found');
      where.genreId = genre.id;
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
      items: await Promise.all(items.map((t) => this.mapTrack(t))),
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
      ...(await this.mapTrack(track)),
      credits: track.credits,
    };
  }

  async createTrack(userId: string, dto: CreateTrackDto) {
    const profile = await this.prisma.artistProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Artist profile not found');

    if (dto.genreId) {
      const genre = await this.prisma.genre.findUnique({ where: { id: dto.genreId } });
      if (!genre) throw new NotFoundException('Genre not found');
    }

    const slug = this.generateSlug(dto.title);
    const contentType = dto.contentType ?? 'audio/mpeg';
    const ext = this.storageService.extFromMimeType(contentType);

    const track = await this.prisma.track.create({
      data: {
        artistProfileId: profile.id,
        uploadedById: userId,
        title: dto.title,
        slug,
        description: dto.description,
        genreId: dto.genreId,
        explicit: dto.explicit ?? false,
        releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
        status: 'UPLOADING',
        audioUrl: '', // will be set below after key generation
      },
    });

    const key = this.storageService.generateAudioKey(track.id, ext);
    const { url } = await this.storageService.createPresignedPut(key, contentType, 600);

    // Persist the storage key on the track
    await this.prisma.track.update({
      where: { id: track.id },
      data: { audioUrl: key },
    });

    const expiresAt = new Date(Date.now() + 600_000).toISOString();
    return { trackId: track.id, uploadUrl: url, storageKey: key, expiresAt };
  }

  async uploadCover(userId: string, trackId: string, file: Express.Multer.File) {
    await this.assertOwnsTrack(userId, trackId);

    if (!COVER_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid cover MIME type: ${file.mimetype}`);
    }
    if (file.size > COVER_MAX_BYTES) {
      throw new BadRequestException('Cover image exceeds 10 MB limit');
    }

    const ext = this.storageService.extFromMimeType(file.mimetype);
    const key = this.storageService.generateCoverKey(trackId, ext);

    await this.storageService.putObject(key, file.buffer, file.mimetype);

    await this.prisma.$transaction([
      this.prisma.mediaAsset.create({
        data: {
          trackId,
          assetType: 'COVER',
          storageKey: key,
          mimeType: file.mimetype,
          fileSizeBytes: BigInt(file.size),
          checksum: '',
        },
      }),
      this.prisma.track.update({
        where: { id: trackId },
        data: { coverImageUrl: key },
      }),
    ]);

    const coverImageUrl = await this.storageService.resolveCoverUrl(key);
    return { coverImageUrl: coverImageUrl ?? key };
  }

  async finalizeUpload(userId: string, trackId: string) {
    await this.assertOwnsTrack(userId, trackId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true, audioUrl: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    if (track.status !== 'UPLOADING') {
      throw new ConflictException('Track is not in UPLOADING state');
    }

    if (!track.audioUrl) {
      throw new ConflictException('Upload not completed — file not found in storage');
    }

    const head = await this.storageService.headObject(track.audioUrl);
    if (head === null) {
      throw new ConflictException('Upload not completed — file not found in storage');
    }

    if (head.size > AUDIO_MAX_BYTES) {
      throw new BadRequestException('Audio file exceeds 150 MB limit');
    }

    // Validate MIME type from storage — R2 may record what the client sent;
    // reject anything that is not a whitelisted audio type.
    const normalizedMime = head.contentType.split(';')[0]?.trim() ?? '';
    if (!AUDIO_MIME_TYPES.includes(normalizedMime) && !normalizedMime.startsWith('audio/')) {
      throw new BadRequestException(`Invalid audio MIME type: ${head.contentType}`);
    }

    await this.prisma.$transaction([
      this.prisma.mediaAsset.create({
        data: {
          trackId,
          assetType: 'AUDIO',
          storageKey: track.audioUrl,
          mimeType: head.contentType,
          fileSizeBytes: BigInt(head.size),
          checksum: head.etag,
        },
      }),
      this.prisma.track.update({
        where: { id: trackId },
        data: { status: 'PROCESSING', processingError: null },
      }),
    ]);

    await this.audioQueueService.enqueueAudioProcessing({
      trackId,
      storageKey: track.audioUrl,
      mimeType: head.contentType,
    });

    return { trackId, status: 'PROCESSING' };
  }

  async updateTrack(userId: string, trackId: string, dto: UpdateTrackDto) {
    await this.assertOwnsTrack(userId, trackId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    if (!['DRAFT', 'PENDING_REVIEW'].includes(track.status)) {
      throw new ConflictException('Track cannot be edited in current status');
    }

    if (dto.genreId) {
      const genre = await this.prisma.genre.findUnique({ where: { id: dto.genreId } });
      if (!genre) throw new NotFoundException('Genre not found');
    }

    return this.prisma.track.update({
      where: { id: trackId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.genreId !== undefined ? { genreId: dto.genreId } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.explicit !== undefined ? { explicit: dto.explicit } : {}),
        ...(dto.releaseDate !== undefined ? { releaseDate: new Date(dto.releaseDate) } : {}),
      },
    });
  }

  async addCredit(userId: string, trackId: string, dto: AddCreditDto) {
    await this.assertOwnsTrack(userId, trackId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    if (!['DRAFT', 'PENDING_REVIEW'].includes(track.status)) {
      throw new ConflictException('Track cannot be edited in current status');
    }

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('User not found');
    }

    return this.prisma.trackCredit.create({
      data: { trackId, name: dto.name, role: dto.role, userId: dto.userId },
    });
  }

  async submitTrack(userId: string, trackId: string) {
    await this.assertOwnsTrack(userId, trackId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true, processedAt: true, durationSeconds: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    if (track.status !== 'DRAFT') {
      throw new ConflictException('Cannot submit from current status');
    }

    if (!track.processedAt || !track.durationSeconds) {
      throw new ConflictException('Track not ready: audio not processed');
    }

    return this.prisma.track.update({
      where: { id: trackId },
      data: { status: 'PENDING_REVIEW' },
    });
  }

  async publishTrack(trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true, processedAt: true, releaseDate: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    if (track.status !== 'PENDING_REVIEW') {
      throw new ConflictException('Track is not in PENDING_REVIEW status');
    }

    if (!track.processedAt) {
      throw new ConflictException('Cannot publish unprocessed track');
    }

    return this.prisma.track.update({
      where: { id: trackId },
      data: {
        status: 'PUBLISHED',
        releaseDate: track.releaseDate ?? new Date(),
      },
    });
  }

  async rejectTrack(trackId: string, dto: RejectTrackDto) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    if (track.status !== 'PENDING_REVIEW') {
      throw new ConflictException('Track is not in PENDING_REVIEW status');
    }

    return this.prisma.track.update({
      where: { id: trackId },
      data: { status: 'REJECTED', processingError: dto.reason ?? null },
    });
  }

  async getMyTracks(userId: string, cursor?: string, limit = 20) {
    const profile = await this.prisma.artistProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Artist profile not found');

    const tracks = await this.prisma.track.findMany({
      where: { artistProfileId: profile.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: TRACK_SELECT,
    });

    const hasNext = tracks.length > limit;
    const items = hasNext ? tracks.slice(0, limit) : tracks;
    const nextCursor = hasNext ? items[items.length - 1]?.id : undefined;

    return {
      items: await Promise.all(items.map((t) => this.mapTrack(t))),
      nextCursor,
    };
  }

  async getMyTrackById(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: {
        ...TRACK_SELECT,
        artistProfile: { select: { stageName: true, userId: true } },
        credits: {
          select: { id: true, role: true, name: true, userId: true },
        },
      },
    });

    if (!track) throw new NotFoundException('Track not found');

    // Verify the requesting user owns this track
    if (track.artistProfile.userId !== userId) {
      throw new ForbiddenException('Not your track');
    }

    // mapTrack only needs stageName from artistProfile; pass a compatible shape
    const mapped = await this.mapTrack({ ...track, artistProfile: { stageName: track.artistProfile.stageName } });
    return { ...mapped, credits: track.credits };
  }

  async streamTrack(trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { status: true, audioUrl: true },
    });

    if (!track || track.status !== 'PUBLISHED') {
      throw new NotFoundException('Track not found');
    }

    if (!track.audioUrl) {
      this.logger.error(`Published track ${trackId} has no audioUrl`);
      throw new InternalServerErrorException('Audio key missing for published track');
    }

    const url = await this.storageService.createPresignedGet(track.audioUrl, 3600);
    return { url };
  }

  async recordPlay(
    userId: string | null,
    trackId: string,
    dto: RecordPlayDto,
    req: Request,
  ) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, status: true, playCount: true },
    });

    if (!track || track.status !== 'PUBLISHED') {
      throw new NotFoundException('Track not found');
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ?? null;
    const userAgent = req.headers['user-agent'] ?? null;

    try {
      await this.prisma.$transaction([
        this.prisma.playbackEvent.create({
          data: {
            trackId,
            userId,
            clientPlayId: dto.clientPlayId,
            ipAddress,
            userAgent,
          },
        }),
        this.prisma.track.update({
          where: { id: trackId },
          data: { playCount: { increment: 1 } },
        }),
      ]);
      return { played: true, playCount: Number(track.playCount) + 1 };
    } catch (err) {
      // P2002 = unique constraint violation — duplicate clientPlayId
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') {
        return { played: false, playCount: Number(track.playCount) };
      }
      throw err;
    }
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
