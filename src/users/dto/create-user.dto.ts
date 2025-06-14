import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

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

  @ApiProperty({
    description: 'Senha do usuário (mínimo de 8 caracteres)',
    example: 'S3nh@F0rt3!',
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Tipo do usuário no sistema (Colaborador, Gestor, RH, etc.)',
    example: 'Colaborador',
  })
  @IsString()
  @IsNotEmpty()
  userType: string;

  @ApiProperty({
    description: 'ID da Role (cargo/trilha) associada ao usuário (opcional)',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiProperty({
    description: 'ID do líder direto do usuário (opcional)',
    example: 'f0e9d8c7-b6a5-4321-fedc-ba9876543210',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  leaderId?: string;
}