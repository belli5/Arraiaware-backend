import { ConflictException } from '@nestjs/common';

export class CriterionInUseException extends ConflictException {
  constructor(id: string) {
    super(`O critério com ID ${id} não pode ser removido pois está associado a um ou mais cargos.`);
  }
}