import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SubmitPeerEvaluationDto {
  @ApiProperty({ description: 'ID do colaborador que está realizando a avaliação' })
  @IsUUID()
  evaluatorUserId: string;

  @ApiPropertyOptional({ description: 'ID do colaborador que está sendo avaliado (opcional)' })
  @IsUUID()
  @IsOptional()
  evaluatedUserId?: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação atual' })
  @IsUUID()
  cycleId: string;

  @ApiPropertyOptional({ description: 'Projeto em que atuaram juntos' })
  @IsString()
  @IsOptional()
  project?: string;

  @ApiPropertyOptional({ description: 'Feedback sobre a motivação para trabalhar novamente com o colaborador' })
  @IsString()
  @IsOptional()
  motivatedToWorkAgain?: string;

  @ApiProperty({ description: 'Nota geral para o colaborador', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  generalScore: number;

  @ApiProperty({ description: 'Pontos que o colaborador deve melhorar' })
  @IsString()
  @IsNotEmpty()
  pointsToImprove: string;

  @ApiProperty({ description: 'Pontos que o colaborador faz bem e deve explorar' })
  @IsString()
  @IsNotEmpty()
  pointsToExplore: string;
}