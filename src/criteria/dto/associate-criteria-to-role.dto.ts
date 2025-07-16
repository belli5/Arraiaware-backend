import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssociateCriteriaToRoleDto {
  @ApiProperty({
    description: 'Lista de IDs dos Critérios a serem associados ao Cargo/Trilha',
    example: [
      'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    ],
    isArray: true,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  criterionIds: string[];
}