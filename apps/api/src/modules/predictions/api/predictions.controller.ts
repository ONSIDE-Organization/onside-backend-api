// src/modules/predictions/api/predictions.controller.ts
import { Body, Controller, HttpCode, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { SubmitPickUseCase } from '../application/submit-pick.use-case';
import { submitPickSchema } from './dto/submit-pick.dto';
import type { SubmitPickDto } from './dto/submit-pick.dto';

@ApiTags('Predictions')
@ApiBearerAuth('onside-jwt')
@Controller({ path: 'predictions', version: '1' })
export class PredictionsController {
  constructor(private readonly submitPick: SubmitPickUseCase) {}

  @Post('pick')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(submitPickSchema))
  @ApiOperation({ summary: 'Submit or update a pick for a prediction' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['predictionId', 'selectedOption'],
      properties: {
        predictionId: { type: 'string', format: 'uuid' },
        selectedOption: { type: 'string', example: 'Arsenal' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Pick submitted or updated.' })
  @ApiResponse({ status: 400, description: 'Prediction locked or invalid option.' })
  async submitPickForPrediction(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitPickDto,
  ) {
    return this.submitPick.execute(user.id, dto);
  }
}