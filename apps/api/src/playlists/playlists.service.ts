import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTrackDto } from './dto/add-track.dto';

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlaylist(userId: string, dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async getPlaylist(id: string, requestUserId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: {
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
            },
          },
        },
      },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');
    if (!playlist.isPublic && playlist.userId !== requestUserId) {
      throw new ForbiddenException('This playlist is private');
    }

    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description ?? undefined,
      isPublic: playlist.isPublic,
      coverImageUrl: playlist.coverImageUrl ?? undefined,
      trackCount: playlist.trackCount,
      userId: playlist.userId,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      tracks: playlist.tracks.map((pt) => ({
        position: pt.position,
        addedAt: pt.addedAt.toISOString(),
        track: {
          id: pt.track.id,
          title: pt.track.title,
          slug: pt.track.slug,
          artistId: pt.track.artistProfileId,
          artistName: pt.track.artistProfile.stageName,
          coverImageUrl: pt.track.coverImageUrl ?? undefined,
          durationSeconds: pt.track.durationSeconds ?? undefined,
          playCount: Number(pt.track.playCount),
          likeCount: pt.track.likeCount,
          explicit: pt.track.explicit,
          releaseDate: pt.track.releaseDate?.toISOString() ?? undefined,
          genreId: pt.track.genreId ?? undefined,
          genreName: pt.track.genre?.name ?? undefined,
          status: pt.track.status,
        },
      })),
    };
  }

  async updatePlaylist(id: string, userId: string, dto: UpdatePlaylistDto) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    return this.prisma.playlist.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        isPublic: dto.isPublic,
      },
    });
  }

  async deletePlaylist(id: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    await this.prisma.playlist.delete({ where: { id } });
    return { message: 'Playlist deleted' };
  }

  async addTrack(playlistId: string, userId: string, dto: AddTrackDto) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    const track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
    if (!track || track.status !== 'PUBLISHED') {
      throw new NotFoundException('Track not found or not published');
    }

    const position = dto.position ?? playlist.trackCount;

    await this.prisma.$transaction([
      this.prisma.playlistTrack.create({
        data: { playlistId, trackId: dto.trackId, position },
      }),
      this.prisma.playlist.update({
        where: { id: playlistId },
        data: { trackCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Track added to playlist' };
  }

  async removeTrack(playlistId: string, userId: string, trackId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    const pt = await this.prisma.playlistTrack.findUnique({
      where: { playlistId_trackId: { playlistId, trackId } },
    });
    if (!pt) throw new NotFoundException('Track not in playlist');

    await this.prisma.$transaction([
      this.prisma.playlistTrack.delete({
        where: { playlistId_trackId: { playlistId, trackId } },
      }),
      this.prisma.playlist.update({
        where: { id: playlistId },
        data: { trackCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Track removed from playlist' };
  }

  async getUserPlaylists(userId: string) {
    const playlists = await this.prisma.playlist.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return playlists.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? undefined,
      isPublic: p.isPublic,
      coverImageUrl: p.coverImageUrl ?? undefined,
      trackCount: p.trackCount,
      userId: p.userId,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }
}
