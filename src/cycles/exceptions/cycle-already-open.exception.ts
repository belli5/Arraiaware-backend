import { ConflictException } from '@nestjs/common';

export class CycleAlreadyOpenException extends ConflictException {
  constructor(name: string) {
    super(
      `Já existe um ciclo aberto ('${name}'). Por favor, feche o ciclo atual antes de criar um novo.`,
    );
  }
}