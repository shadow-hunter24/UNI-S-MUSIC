import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GenresService } from './genres.service';

@ApiTags('genres')
@Controller('api/v1/genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOperation({ summary: 'Get all genres with published track counts' })
  findAll() {
    return this.genresService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get genre by slug with paginated published tracks' })
  findBySlug(
    @Param('slug') slug: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.genresService.findBySlug(slug, cursor, limit ? parseInt(limit, 10) : 20);
  }
}
