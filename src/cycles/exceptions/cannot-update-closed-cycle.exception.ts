import { ForbiddenException } from '@nestjs/common';

export class CannotUpdateClosedCycleException extends ForbiddenException {
  constructor(id: string) {
    super(`O ciclo com ID ${id} está fechado e não pode ser modificado.`);
  }
}