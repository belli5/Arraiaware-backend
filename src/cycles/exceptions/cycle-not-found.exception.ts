import { EntityNotFoundException } from '../../common/exceptions/entity-not-found.exception';

export class CycleNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Ciclo', id);
  }
}