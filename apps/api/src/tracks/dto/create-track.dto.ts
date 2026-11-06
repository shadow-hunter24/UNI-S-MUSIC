import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';
import { AUDIO_MIME_TYPES } from '../../storage/storage.service';

export class CreateTrackDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  genreId?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  explicit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ enum: AUDIO_MIME_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(AUDIO_MIME_TYPES)
  contentType?: string;
}
