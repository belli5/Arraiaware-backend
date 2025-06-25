import { InternalServerErrorException as NestInternalServerErrorException } from '@nestjs/common';

export class InternalServerErrorException extends NestInternalServerErrorException {
  constructor(message: string = 'Ocorreu um erro interno no servidor.') {
    super(message);
  }
}