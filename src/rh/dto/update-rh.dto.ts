import { PartialType } from '@nestjs/swagger';
import { CreateRhDto } from './create-rh.dto';

export class UpdateRhDto extends PartialType(CreateRhDto) {}
