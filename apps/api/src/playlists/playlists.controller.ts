import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTrackDto } from './dto/add-track.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('playlists')
@Controller('api/v1/playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  // Static routes BEFORE /:id to avoid route conflicts

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's playlists" })
  getUserPlaylists(@CurrentUser() user: { sub: string }) {
    return this.playlistsService.getUserPlaylists(user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new playlist' })
  createPlaylist(@CurrentUser() user: { sub: string }, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.createPlaylist(user.sub, dto);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a playlist by ID' })
  getPlaylist(@Param('id') id: string, @Request() req: { user?: { sub: string } }) {
    return this.playlistsService.getPlaylist(id, req.user?.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a playlist' })
  updatePlaylist(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistsService.updatePlaylist(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a playlist' })
  @HttpCode(HttpStatus.OK)
  deletePlaylist(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.playlistsService.deletePlaylist(id, user.sub);
  }

  @Post(':id/tracks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a track to a playlist' })
  addTrack(
    @Param('id') playlistId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: AddTrackDto,
  ) {
    return this.playlistsService.addTrack(playlistId, user.sub, dto);
  }

  @Delete(':id/tracks/:trackId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a track from a playlist' })
  @HttpCode(HttpStatus.OK)
  removeTrack(
    @Param('id') playlistId: string,
    @CurrentUser() user: { sub: string },
    @Param('trackId') trackId: string,
  ) {
    return this.playlistsService.removeTrack(playlistId, user.sub, trackId);
  }
}
