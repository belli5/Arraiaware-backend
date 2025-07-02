import { OmitType } from '@nestjs/swagger';
import { GetEvaluationsQueryDto } from '../../rh/dto/get-evaluations-query.dto';

export class GetCommitteePanelQueryDto extends OmitType(GetEvaluationsQueryDto, [
  'status',
  'department',
] as const) {}