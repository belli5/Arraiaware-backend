import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssociateCriterionDto {
  @ApiProperty({
    description: 'ID do Cargo/Trilha (Role) ao qual o critério será associado',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  roleId: string;
}