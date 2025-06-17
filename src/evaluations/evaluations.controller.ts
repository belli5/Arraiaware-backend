import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitSelfEvaluationDto } from './dto/submit-self-evaluation.dto';
import { EvaluationsService } from './evaluations.service';

@ApiTags('Evaluations')
@Controller('api/evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post('self')
  @ApiOperation({ summary: 'Submeter uma autoavaliação' })
  @ApiResponse({ status: 201, description: 'Autoavaliação submetida com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  submitSelfEvaluation(@Body() submitSelfEvaluationDto: SubmitSelfEvaluationDto) {
    return this.evaluationsService.submitSelfEvaluation(submitSelfEvaluationDto);
  }


}