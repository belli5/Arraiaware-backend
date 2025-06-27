import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'A senha atual do usuário',
    example: 'S3nh@F0rt3!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'A nova senha do usuário (mínimo de 8 caracteres)',
    example: 'N0v@S3nh@F0rt3!',
  })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
  newPassword: string;
}