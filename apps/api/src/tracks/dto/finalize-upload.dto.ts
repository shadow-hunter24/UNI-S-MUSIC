import { ApiProperty } from '@nestjs/swagger';

export class FinalizeUploadDto {
  @ApiProperty({ description: 'No body required; track ID is from the URL param.' })
  readonly _placeholder?: never;
}
