import { BadRequestException } from '@nestjs/common';

export class InvalidDateRangeException extends BadRequestException {
  constructor() {
    super('A data de início (startDate) não pode ser posterior à data de término (endDate).');
  }
}