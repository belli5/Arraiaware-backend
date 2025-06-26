import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitReferenceIndicationDto {
  @ApiProperty({ description: 'ID do colaborador que está fazendo a indicação' })
  @IsUUID()
  indicatorUserId: string;

  @ApiPropertyOptional({ description: 'ID do colaborador que está sendo indicado como referência (opcional)' })
  @IsUUID()
  @IsOptional()
  indicatedUserId?: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação atual' })
  @IsUUID()
  cycleId: string;

  @ApiProperty({ description: 'Justificativa para a indicação' })
  @IsString()
  @IsNotEmpty()
  justification: string;
}