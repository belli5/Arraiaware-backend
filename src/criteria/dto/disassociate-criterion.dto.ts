import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DisassociateCriterionDto {
  @ApiProperty({
    description: 'ID do Cargo/Trilha (Role) do qual o critério será desvinculado',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  roleId: string;
}