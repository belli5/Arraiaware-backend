import { IsNotEmpty, IsString } from 'class-validator';

export class EncryptDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}