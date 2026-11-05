import { ApiProperty } from '@nestjs/swagger';

export class ArtistResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() stageName!: string;
  @ApiProperty({ required: false }) bio?: string;
  @ApiProperty({ required: false }) imageUrl?: string;
  @ApiProperty({ required: false }) headerImageUrl?: string;
  @ApiProperty({ required: false }) country?: string;
  @ApiProperty() totalFollowers!: number;
  @ApiProperty() totalTracks!: number;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty() verificationStatus!: string;
}
