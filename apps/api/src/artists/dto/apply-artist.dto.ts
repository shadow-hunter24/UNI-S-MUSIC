import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyArtistDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  stageName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;
}
