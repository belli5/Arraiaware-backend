import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3000;

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

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  const appUrl = await app.getUrl();
  logger.log(`🚀 Aplicação rodando em: ${appUrl}`);
  logger.log(`📚 Documentação Swagger disponível em: ${appUrl}/api-docs`);
}
bootstrap();
