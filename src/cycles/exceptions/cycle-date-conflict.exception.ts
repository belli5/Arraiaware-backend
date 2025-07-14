import { ConflictException } from '@nestjs/common';

export class CycleDateConflictException extends ConflictException {
  constructor(
    conflictingCycleName: string,
    startDate: Date,
    endDate: Date,
  ) {
    super(
      `As datas do novo ciclo entram em conflito com o ciclo existente '${conflictingCycleName}' (de ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}).`,
    );
  }
}