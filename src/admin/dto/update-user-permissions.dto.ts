import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateUserPermissionsDto {
  @ApiPropertyOptional({
    description: 'O novo tipo de usuário no sistema',
    enum: UserType,
    example: UserType.GESTOR,
  })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @ApiPropertyOptional({
    description: 'Lista de IDs dos novos Cargos/Trilhas do usuário. Substitui a lista existente.',
    example: ['uuid-do-cargo-1', 'uuid-da-trilha-2'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  roleIds?: string[];
}