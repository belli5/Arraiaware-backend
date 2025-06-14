import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'O nome do cargo, trilha ou unidade (deve ser único)',
    example: 'Desenvolvedor Pleno',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'O tipo da role, por exemplo: CARGO, TRILHA ou UNIDADE',
    example: 'CARGO',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Uma breve descrição do papel (opcional)',
    example: 'Responsável pelo desenvolvimento de novas funcionalidades.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
