import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { Public } from 'src/auth/public.decorator';
import { DecryptDto } from './dto/decrypt.dto';
import { EncryptDto } from './dto/encrypt.dto';
import { EncryptionService } from './encryption.service';


@Public()
@Controller('utils/encryption') 
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('encrypt')
  encryptData(@Body(new ValidationPipe()) body: EncryptDto) {
    const encrypted = this.encryptionService.encrypt(body.text);
    return { encrypted };
  }

  @Post('decrypt')
  decryptData(@Body(new ValidationPipe()) body: DecryptDto) {
    const decrypted = this.encryptionService.decrypt(body.encryptedText);
    return { decrypted };
  }
}