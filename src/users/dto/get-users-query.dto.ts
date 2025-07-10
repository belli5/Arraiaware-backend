import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isActive?: string;
}