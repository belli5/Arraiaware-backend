import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') {
                return crypto.randomBytes(32).toString('hex');
              }
              if (key === 'ENCRYPTION_IV') {
                return crypto.randomBytes(16).toString('hex');
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('deve criptografar e descriptografar um texto de volta ao original', () => {
    const originalText = 'Este é um texto super secreto!';
    const encryptedText = service.encrypt(originalText);
    const decryptedText = service.decrypt(encryptedText);

    expect(encryptedText).not.toEqual(originalText);
    expect(decryptedText).toEqual(originalText);
  });

  it('deve retornar null se a entrada for null', () => {
    expect(service.encrypt(null)).toBeNull();
    expect(service.decrypt(null)).toBeNull();
  });

  it('deve retornar undefined se a entrada for undefined', () => {
      expect(service.encrypt(undefined)).toBeUndefined();
      expect(service.decrypt(undefined)).toBeUndefined();
  });
});