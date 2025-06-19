import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetEvaluationsQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome do colaborador ou cargo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filtra por status da avaliação",
    enum: ['Concluída', 'Pendente', 'Em Atraso'],
  })
  @IsOptional()
  @IsIn(['Concluída', 'Pendente', 'Em Atraso'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtra por nome exato do departamento/cargo' })
  @IsOptional()
  @IsString()
  department?: string;

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