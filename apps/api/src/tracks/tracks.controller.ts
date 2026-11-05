import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TracksService } from './tracks.service';
import { TracksQueryDto } from './dto/tracks-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('tracks')
@Controller('api/v1/tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  @ApiOperation({ summary: 'Get published tracks (cursor paginated)' })
  getPublishedTracks(@Query() query: TracksQueryDto) {
    return this.tracksService.getPublishedTracks(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single published track by ID' })
  getTrackById(@Param('id') id: string) {
    return this.tracksService.getTrackById(id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a track' })
  @HttpCode(HttpStatus.OK)
  likeTrack(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.likeTrack(user.sub, trackId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a track' })
  @HttpCode(HttpStatus.OK)
  unlikeTrack(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.unlikeTrack(user.sub, trackId);
  }

  @Get(':id/liked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user liked a track' })
  isLiked(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.isLiked(user.sub, trackId);
  }
}
