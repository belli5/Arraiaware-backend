import { EntityConflictException } from '../../common/exceptions/entity-conflict.exception';

export class CycleNameConflictException extends EntityConflictException {
  constructor(name: string) {
    super(`Já existe um ciclo de avaliação com o nome '${name}'.`);
  }
}