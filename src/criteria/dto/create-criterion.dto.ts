import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCriterionDto {
  @ApiProperty({
    description: 'O pilar ao qual o critério pertence',
    example: 'Comportamento',
    enum: ['Comportamento', 'Execução', 'Gestão e Liderança'],
  })
  @IsString({ message: 'O pilar deve ser uma string.' })
  @IsNotEmpty({ message: 'O pilar não pode ser vazio.' })
  @IsIn(['Comportamento', 'Execução', 'Gestão e Liderança'], {
    message: 'O pilar deve ser um dos seguintes: Comportamento, Execução, Gestão e Liderança.',
  })
  pillar: string;

  @ApiProperty({
    description: 'O nome específico do critério',
    example: 'Sentimento de Dono',
  })
  @IsString()
  @IsNotEmpty()
  criterionName: string;

  @ApiProperty({
    description: 'Uma explicação detalhada sobre o que o critério avalia (opcional)',
    example: 'Avalia a proatividade e responsabilidade do colaborador com as entregas.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}