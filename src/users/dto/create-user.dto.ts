import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { UserType } from '@prisma/client';

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
  
  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  roleId?: string;


  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  leaderId?: string;
}
