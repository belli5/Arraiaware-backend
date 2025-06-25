import { ConflictException } from '@nestjs/common';

export class CycleInUseException extends ConflictException {
  constructor(id: string) {
    super(`O ciclo com ID ${id} não pode ser removido pois já possui avaliações associadas.`);
  }
}