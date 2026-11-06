import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RecordPlayDto {
  @ApiProperty({ description: 'Client-generated UUID per play session (idempotency key)' })
  @IsUUID()
  clientPlayId!: string;
}
