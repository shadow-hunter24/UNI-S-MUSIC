import { ApiProperty } from '@nestjs/swagger';

export class GenreDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ required: false }) description?: string;
  @ApiProperty({ required: false }) imageUrl?: string;
  @ApiProperty() trackCount!: number;
}
