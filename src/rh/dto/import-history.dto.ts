import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class HistoryItemDto {
  @ApiProperty()
  @IsEmail()
  userEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cycleName: string;

  @ApiProperty({ enum: ['SELF', 'PEER', 'REFERENCE'] })
  @IsIn(['SELF', 'PEER', 'REFERENCE'])
  evaluationType: string;

  // --- Campos de Identificação ---
  @ApiPropertyOptional({ description: 'Email do avaliador (para PEER)' })
  @IsEmail()
  @IsOptional()
  evaluatorEmail?: string;

  @ApiPropertyOptional({ description: 'Email do indicado (para REFERENCE)' })
  @IsEmail()
  @IsOptional()
  indicatedEmail?: string;

  // --- Campos para SELF ---
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  criterionName?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ description: 'Justificativa para SELF ou REFERENCE' })
  @IsString()
  @IsOptional()
  justification?: string;
  
  // --- CAMPO CORRIGIDO E ADICIONADO ---
  @ApiPropertyOptional({ description: 'Descrição textual da nota (para SELF)' })
  @IsString()
  @IsOptional()
  scoreDescription?: string;

  // --- Campos para PEER (Avaliação 360) ---
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  project?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  motivatedToWorkAgain?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  generalScore?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pointsToImprove?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pointsToExplore?: string;
}

export class ImportHistoryDto {
  @ApiProperty({ type: [HistoryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryItemDto)
  records: HistoryItemDto[];
}