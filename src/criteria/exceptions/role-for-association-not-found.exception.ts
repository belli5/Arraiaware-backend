import { NotFoundException } from '@nestjs/common';

export class RoleForAssociationNotFoundException extends NotFoundException {
  constructor(roleId: string) {
    super(`O Cargo (Role) com ID ${roleId} não foi encontrado para realizar a associação.`);
  }
}