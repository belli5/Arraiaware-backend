import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SubmitReferenceIndicationDto {
  @ApiProperty({ description: 'ID do colaborador que está fazendo a indicação' })
  @IsUUID()
  indicatorUserId: string;

  @ApiProperty({ description: 'ID do colaborador que está sendo indicado como referência' })
  @IsUUID()
  indicatedUserId: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação atual' })
  @IsUUID()
  cycleId: string;

  @ApiProperty({
    description: 'Tipo da referência',
    enum: ['Técnica', 'Cultural'],
  })
  @IsIn(['Técnica', 'Cultural'])
  referenceType: string;

  @ApiProperty({ description: 'Justificativa para a indicação' })
  @IsString()
  @IsNotEmpty()
  justification: string;
}