import { ApiProperty } from '@nestjs/swagger';

class CriterionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pillar: string;

  @ApiProperty()
  criterionName: string;

  @ApiProperty()
  description: string;
}

export class TrilhaResponseDto {
  @ApiProperty({ description: 'ID da trilha' })
  id: string;

  @ApiProperty({ description: 'Nome da trilha' })
  nome_da_trilha: string;

  @ApiProperty({ type: [CriterionDto], description: 'Lista de critérios da trilha' })
  criterios: CriterionDto[];
}