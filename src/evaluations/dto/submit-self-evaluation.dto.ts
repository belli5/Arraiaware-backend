import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { EvaluationItemDto } from './evaluation-item.dto';
export class SubmitSelfEvaluationDto {
  @ApiProperty({ description: 'ID do colaborador que está se autoavaliando' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação atual' })
  @IsUUID()
  cycleId: string;

  @ApiProperty({ type: [EvaluationItemDto], description: 'Lista das avaliações por critério' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationItemDto)
  evaluations: EvaluationItemDto[];
}