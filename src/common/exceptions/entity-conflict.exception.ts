import { ConflictException } from '@nestjs/common';

export class EntityConflictException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}