import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@rocketcorp.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}