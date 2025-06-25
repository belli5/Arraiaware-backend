
import { EntityNotFoundException } from '../../common/exceptions/entity-not-found.exception';

export class CriterionNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Critério', id);
  }
}