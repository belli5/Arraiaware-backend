import { UnauthorizedException as NestUnauthorizedException } from '@nestjs/common';

export class UnauthorizedException extends NestUnauthorizedException {
  constructor(message: string = 'Autenticação necessária') {
    super(message);
  }
}