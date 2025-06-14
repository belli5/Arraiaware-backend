import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
     const app = await NestFactory.create(AppModule);
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder()
    .setTitle('RPE - Rocket Performance & Engagement API')
    .setDescription('API para o sistema de avaliação de desempenho da Rocket Corp.')
    .setVersion('1.0')
    .addTag('Auth', 'Operações de Autenticação')
    .addTag('Users', 'Gerenciamento de Usuários')
    .addTag('Roles', 'Gerenciamento de Cargos/Trilhas')
    .addTag('Criteria', 'Gerenciamento de Critérios de Avaliação')
    .addTag('Cycles', 'Gerenciamento de Ciclos de Avaliação')
    .addTag('Evaluations', 'Submissão de Avaliações')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();