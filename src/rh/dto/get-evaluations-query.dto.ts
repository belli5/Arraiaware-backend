import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class GetEvaluationsQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome do colaborador' })
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

  @ApiPropertyOptional({ description: 'Filtra por nome do cargo (department)' })
  @IsOptional()
  @IsString()
  department?: string;
  
  @ApiPropertyOptional({ description: 'Filtra por nome da trilha (track)' })
  @IsOptional()
  @IsString()
  track?: string;
  
  @ApiPropertyOptional({ description: 'ID do ciclo de avaliação para filtrar. Se não fornecido, busca em todos.' })
  @IsOptional()
  @IsUUID()
  cycleId?: string;

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