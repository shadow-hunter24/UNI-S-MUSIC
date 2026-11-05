import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArtistsService } from './artists.service';
import { ApplyArtistDto } from './dto/apply-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('artists')
@Controller('api/v1/artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  // IMPORTANT: Static routes before /:id to avoid conflicts

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become an artist' })
  apply(@CurrentUser() user: { sub: string }, @Body() dto: ApplyArtistDto) {
    return this.artistsService.apply(user.sub, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my artist profile" })
  getMyProfile(@CurrentUser() user: { sub: string }) {
    return this.artistsService.getMyProfile(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update my artist profile" })
  updateMyProfile(@CurrentUser() user: { sub: string }, @Body() dto: UpdateArtistDto) {
    return this.artistsService.updateMyProfile(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public artist profile by ID' })
  findById(@Param('id') id: string) {
    return this.artistsService.findById(id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow an artist' })
  @HttpCode(HttpStatus.OK)
  followArtist(@CurrentUser() user: { sub: string }, @Param('id') artistId: string) {
    return this.artistsService.followArtist(user.sub, artistId);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow an artist' })
  @HttpCode(HttpStatus.OK)
  unfollowArtist(@CurrentUser() user: { sub: string }, @Param('id') artistId: string) {
    return this.artistsService.unfollowArtist(user.sub, artistId);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get followers of an artist (cursor paginated)' })
  getFollowers(
    @Param('id') artistId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.artistsService.getFollowers(artistId, cursor, limit ? parseInt(limit, 10) : 20);
  }
}
