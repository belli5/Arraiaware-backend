import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCycleDto } from './create-cycle.dto';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCycleDto extends PartialType(CreateCycleDto) {
  @ApiProperty({
    description: 'O status atual do ciclo',
    example: 'Fechado',
    enum: ['Aberto', 'Fechado'],
    required: false,
  })
  @IsString()
  @IsIn(['Aberto', 'Fechado'])
  @IsOptional()
  status?: string;
}