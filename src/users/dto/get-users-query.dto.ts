// belli5/arraiaware-backend/Arraiaware-backend-10eee35412c40bc27f3c437390c3ffc363d4ccca/src/users/dto/get-users-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetUsersQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou email do usuário' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filtra por tipo de usuário",
    enum: UserType,
  })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ description: 'Página atual da paginação', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Quantidade de itens por página', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit: number = 10;
}