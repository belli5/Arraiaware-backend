import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateCycleDto {
  @ApiProperty({
    description: 'O nome do ciclo de avaliação',
    example: 'Avaliação Semestral 2025.1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Data de início do ciclo',
    example: '2025-06-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Data de término do ciclo',
    example: '2025-06-30T23:59:59.000Z',
  })
  @IsDateString()
  endDate: string;
}