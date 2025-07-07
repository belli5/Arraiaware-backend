
import { IsNotEmpty, IsString } from 'class-validator';

export class DecryptDto {
  @IsString()
  @IsNotEmpty()
  encryptedText: string;
}