import { ForbiddenException as NestForbiddenException } from '@nestjs/common';

export class ForbiddenException extends NestForbiddenException {
  constructor(message: string = 'Você não tem permissão para acessar este recurso') {
    super(message);
  }
}