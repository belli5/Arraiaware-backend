import { EntityConflictException } from '../../common/exceptions/entity-conflict.exception';

export class CriterionNameConflictException extends EntityConflictException {
  constructor(name: string) {
    super(`Já existe um critério com o nome '${name}'.`);
  }
}