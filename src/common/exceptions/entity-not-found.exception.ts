import { NotFoundException } from '@nestjs/common';

export class EntityNotFoundException extends NotFoundException {
  constructor(entityName: string, id: string) {
    super(`${entityName} com ID ${id} não encontrado.`);
  }
}