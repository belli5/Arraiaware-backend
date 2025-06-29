import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Nome do projeto' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação associado' })
  @IsUUID()
  cycleId: string;

  @ApiProperty({ description: 'ID do gestor do projeto' })
  @IsUUID()
  managerId: string;

  @ApiProperty({
    description: 'Array com os IDs dos colaboradores que fazem parte do projeto',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  collaboratorIds: string[];
}