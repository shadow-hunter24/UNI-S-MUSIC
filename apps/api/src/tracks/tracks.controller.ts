import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response, Request } from 'express';
import { TracksService } from './tracks.service';
import { TracksQueryDto } from './dto/tracks-query.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { AddCreditDto } from './dto/add-credit.dto';
import { RejectTrackDto } from './dto/reject-track.dto';
import { RecordPlayDto } from './dto/record-play.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('tracks')
@Controller('api/v1/tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  // 1. GET /tracks — public
  @Get()
  @ApiOperation({ summary: 'Get published tracks (cursor paginated)' })
  getPublishedTracks(@Query() query: TracksQueryDto) {
    return this.tracksService.getPublishedTracks(query);
  }

  // 2. GET /tracks/me — must come before :id
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST, UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current artist's own tracks (all statuses)" })
  getMyTracks(
    @CurrentUser() user: { sub: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tracksService.getMyTracks(user.sub, cursor, limit ? parseInt(limit, 10) : undefined);
  }

  // 3. POST /tracks — create + init upload
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create track and get presigned upload URL' })
  @HttpCode(HttpStatus.CREATED)
  createTrack(@CurrentUser() user: { sub: string }, @Body() dto: CreateTrackDto) {
    return this.tracksService.createTrack(user.sub, dto);
  }

  // 4. GET /tracks/:id — public track by id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single published track by ID' })
  getTrackById(@Param('id') id: string) {
    return this.tracksService.getTrackById(id);
  }

  // 5. PATCH /tracks/:id — update metadata
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update track metadata (owner only, DRAFT/PENDING_REVIEW)' })
  updateTrack(
    @CurrentUser() user: { sub: string },
    @Param('id') trackId: string,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.tracksService.updateTrack(user.sub, trackId, dto);
  }

  // 6. POST /tracks/:id/cover — multipart cover upload
  @Post(':id/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload cover art (server-proxied multipart)' })
  @HttpCode(HttpStatus.OK)
  uploadCover(
    @CurrentUser() user: { sub: string },
    @Param('id') trackId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tracksService.uploadCover(user.sub, trackId, file);
  }

  // 7. POST /tracks/:id/finalize — finalize after S3 PUT
  @Post(':id/finalize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalize upload after direct-to-S3 PUT completes' })
  @HttpCode(HttpStatus.OK)
  finalizeUpload(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.finalizeUpload(user.sub, trackId);
  }

  // 8. POST /tracks/:id/credits — add credit
  @Post(':id/credits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a credit to a track (owner only)' })
  @HttpCode(HttpStatus.CREATED)
  addCredit(
    @CurrentUser() user: { sub: string },
    @Param('id') trackId: string,
    @Body() dto: AddCreditDto,
  ) {
    return this.tracksService.addCredit(user.sub, trackId, dto);
  }

  // 9. POST /tracks/:id/submit — artist submits for review
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a DRAFT track for moderator review' })
  @HttpCode(HttpStatus.OK)
  submitTrack(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.submitTrack(user.sub, trackId);
  }

  // 10. POST /tracks/:id/publish — moderator/admin publishes
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a PENDING_REVIEW track (moderator/admin)' })
  @HttpCode(HttpStatus.OK)
  publishTrack(@Param('id') trackId: string) {
    return this.tracksService.publishTrack(trackId);
  }

  // 11. POST /tracks/:id/reject — moderator/admin rejects
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a PENDING_REVIEW track (moderator/admin)' })
  @HttpCode(HttpStatus.OK)
  rejectTrack(@Param('id') trackId: string, @Body() dto: RejectTrackDto) {
    return this.tracksService.rejectTrack(trackId, dto);
  }

  // 12. GET /tracks/:id/stream — 302 redirect to presigned audio URL
  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream a published track (302 redirect to presigned URL)' })
  async streamTrack(@Param('id') trackId: string, @Res() res: Response) {
    const { url } = await this.tracksService.streamTrack(trackId);
    return res.redirect(302, url);
  }

  // 13. POST /tracks/:id/play — record play event (optional auth)
  @Post(':id/play')
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a play event (idempotent via clientPlayId)' })
  @HttpCode(HttpStatus.OK)
  recordPlay(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') trackId: string,
    @Body() dto: RecordPlayDto,
    @Req() req: Request,
  ) {
    return this.tracksService.recordPlay(user?.sub ?? null, trackId, dto, req);
  }

  // 14. POST /tracks/:id/like
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a track' })
  @HttpCode(HttpStatus.OK)
  likeTrack(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.likeTrack(user.sub, trackId);
  }

  // 15. DELETE /tracks/:id/like
  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a track' })
  @HttpCode(HttpStatus.OK)
  unlikeTrack(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.unlikeTrack(user.sub, trackId);
  }

  // 16. GET /tracks/:id/liked
  @Get(':id/liked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user liked a track' })
  isLiked(@CurrentUser() user: { sub: string }, @Param('id') trackId: string) {
    return this.tracksService.isLiked(user.sub, trackId);
  }
}
