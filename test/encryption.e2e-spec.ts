import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('EncryptionController (e2e)', () => {
  let app: INestApplication;
  const originalText = 'e2e test with a great project structure!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve fazer o ciclo completo de criptografia e descriptografia', async () => {
    let encryptedText: string;

    await request(app.getHttpServer())
      .post('/utils/encryption/encrypt') 
      .send({ text: originalText })
      .expect(201)
      .then((res) => {
        expect(res.body.encrypted).toBeDefined();
        expect(res.body.encrypted).not.toEqual(originalText);
        encryptedText = res.body.encrypted;
      });

    await request(app.getHttpServer())
      .post('/utils/encryption/decrypt')
      .send({ encryptedText: encryptedText })
      .expect(201)
      .then((res) => {
        expect(res.body.decrypted).toBeDefined();
        expect(res.body.decrypted).toEqual(originalText);
      });
  });
});