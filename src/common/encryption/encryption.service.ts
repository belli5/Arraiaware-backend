import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;
  private readonly logger = new Logger(EncryptionService.name);

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const encryptionIv = this.configService.get<string>('ENCRYPTION_IV');

    if (!encryptionKey || !encryptionIv) {
      this.logger.error('Chave de criptografia (ENCRYPTION_KEY) ou IV (ENCRYPTION_IV) não estão definidos no .env');
      throw new Error('As variáveis de ambiente de criptografia devem ser definidas.');
    }

    this.key = Buffer.from(encryptionKey, 'hex');
    this.iv = Buffer.from(encryptionIv, 'hex');
  }

  
  encrypt(text: string): string {
    if (text === null || typeof text === 'undefined') {
      return text;
    }
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return encrypted.toString('hex');
  }


  decrypt(encryptedText: string): string {
    if (encryptedText === null || typeof encryptedText === 'undefined') {
      return encryptedText;
    }
    try {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'hex')), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        this.logger.error(`Falha ao descriptografar. É possível que o dado não estivesse criptografado. Retornando o valor original.`, error.message);
        return encryptedText;
    }
  }
}