import { ApiProperty } from '@nestjs/swagger';

export class TrackResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() artistId!: string;
  @ApiProperty() artistName!: string;
  @ApiProperty({ required: false }) coverImageUrl?: string;
  @ApiProperty({ required: false }) durationSeconds?: number;
  @ApiProperty() playCount!: number;
  @ApiProperty() likeCount!: number;
  @ApiProperty() explicit!: boolean;
  @ApiProperty({ required: false }) releaseDate?: string;
  @ApiProperty({ required: false }) genreId?: string;
  @ApiProperty({ required: false }) genreName?: string;
  @ApiProperty() status!: string;
  // NOTE: audioUrl is intentionally omitted — Phase 4 only
}
