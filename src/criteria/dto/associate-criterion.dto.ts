import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray } from 'class-validator';

export class AssociateCriterionDto {
  @ApiProperty({
    description: 'Lista de IDs dos Cargos/Trilhas (Roles) aos quais o critério será associado',
    example: [
      'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
    ],
    isArray: true,
  })
  @IsArray() 
  @IsUUID('4', { each: true })
  roleIds: string[];
}