import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';


export class UpdateCommitteeEvaluationDto {
  @ApiProperty({
    description: 'A nota final consolidada pelo comitê (de 0 a 5)',
    example: 4.5,
    required: true,
  })
  @IsNumber({}, { message: 'A nota final deve ser um número.' })
  @Min(0, { message: 'A nota final deve ser no mínimo 0.' })
  @Max(5, { message: 'A nota final deve ser no máximo 5.' })
  finalScore: number;


  @ApiProperty({
    description: 'Observação ou justificativa obrigatória do comitê para a nota final',
    example: 'Performance consistente, com bom alinhamento aos valores da empresa.',
    required: true,
  })
  @IsString({ message: 'A observação deve ser um texto.' })
  @IsNotEmpty({ message: 'A observação não pode ser vazia.' })
  observation: string;
}
