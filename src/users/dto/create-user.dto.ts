import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do colaborador',
    example: 'João da Silva',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email único do colaborador',
    example: 'joao.silva@rocketcorp.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Senha do usuário (mínimo de 8 caracteres). Se não for fornecida, uma senha aleatória será gerada e enviada por e-mail.',
    example: 'S3nh@F0rt3!',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Tipo do usuário no sistema',
    enum: UserType,
    example: UserType.COLABORADOR,
  })
  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;

  @ApiPropertyOptional({
    description: 'Unidade à qual o colaborador pertence.',
    example: 'Belo Horizonte',
  })
  @IsString()
  @IsOptional()
  unidade?: string;

  @ApiProperty({ description: 'Lista de IDs de Cargos/Trilhas do usuário' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  roleIds?: string[];

  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  leaderId?: string;
}