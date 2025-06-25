import { InternalServerErrorException } from '@nestjs/common';

export class DatabaseException extends InternalServerErrorException {
  constructor(error: any) {
    console.error(error);
    super('Ocorreu um erro ao processar sua solicitação no banco de dados.');
  }
}