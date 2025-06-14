import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
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

  
  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  roleId?: string;


  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  leaderId?: string;
}
