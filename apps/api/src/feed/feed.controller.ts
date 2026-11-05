import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('feed')
@Controller('api/v1/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('home')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get home feed (optional auth for personalisation)' })
  getFeed(@Request() req: { user?: { sub: string } }) {
    return this.feedService.getFeed(req.user?.sub);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending tracks' })
  getTrending(@Query('limit') limit?: string) {
    return this.feedService.getTrending(limit ? parseInt(limit, 10) : 20);
  }

  @Get('new-releases')
  @ApiOperation({ summary: 'Get newest releases' })
  getNewReleases(@Query('limit') limit?: string) {
    return this.feedService.getNewReleases(limit ? parseInt(limit, 10) : 20);
  }
}
