import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserType } from '@prisma/client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder()
    .setTitle('RPE - Rocket Performance & Engagement API')
    .setDescription('API para o sistema de avaliação de desempenho da Rocket Corp.')
    .setVersion('1.0')
    .addTag('Auth')
    .addTag('Users')
    .addTag('Roles')
    .addTag('Criteria')
    .addTag('Cycles')
    .addTag('Evaluations')

    .addSecurity('bearer', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
    })
  
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const usersService = app.get(UsersService);
  const seedLogger = new Logger('AdminSeed');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rocketcorp.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

  try {
    const adminExists = await usersService.findByEmail(adminEmail);
    if (adminExists) {
      seedLogger.log('Usuário admin já existe. Nenhuma ação necessária.');
    } else {
      seedLogger.log('Criando usuário admin...');
      await usersService.create({
        name: 'Administrador do Sistema',
        email: adminEmail,
        password: adminPassword,
        userType: UserType.ADMIN,
        unidade: 'Corporativo', 
      });
      seedLogger.log('Usuário admin criado com sucesso!');
    }
  } catch (error) {
    if (error.code === 'P2021') {
        seedLogger.warn('Tabelas do banco de dados ainda não existem. Pule a criação do admin por agora. Execute as migrações.');
    } else {
        seedLogger.error('Erro ao criar usuário admin:', error.stack);
    }
  }


  await app.listen(port);

  const logger = new Logger('Bootstrap');
  const appUrl = await app.getUrl();
  logger.log(`🚀 Aplicação rodando em: ${appUrl}`);
  logger.log(`📚 Documentação Swagger disponível em: ${appUrl}/api-docs`);
}
bootstrap();