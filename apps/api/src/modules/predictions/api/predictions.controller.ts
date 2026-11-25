import { Body, Controller, Get, HttpCode, Param, Post, ParseUUIDPipe, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SubmitPicksUseCase } from '../application/submit-pick.use-case';
import { SubmitPicksDto, submitPicksSchema } from './dto/submit-pick.dto';


@ApiTags('Predictions')
@ApiBearerAuth('onside-jwt')
@Controller({ path: 'predictions', version: '1' })
export class PredictionsController {
  constructor(
    private readonly submitPicks: SubmitPicksUseCase,
    private readonly prisma: PrismaService,
  ) {}
  

  @Post()
  @HttpCode(200)
  // @UsePipes(new ZodValidationPipe(submitPicksSchema))
  @ApiOperation({ summary: 'Submit user picks for a matchweek' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['matchweekId', 'picks'],
      properties: {
        matchweekId: { type: 'string', format: 'uuid' },
        picks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              predictionId: { type: 'string', format: 'uuid' },
              selectedOption: { type: 'string', example: 'Arsenal' },
            },
          },
        },
      },
    },
  })
  async submitMyPicks(
    @CurrentUser() user: AuthUser,
    // @Body() dto: SubmitPicksDto,
    @Body(new ZodValidationPipe(submitPicksSchema)) dto: SubmitPicksDto,
  ) {
    return this.submitPicks.execute(user.id, dto);
  }

  @Get('me/:matchweekId')
  @ApiOperation({ summary: 'Get my submitted predictions for a specific matchweek' })
  async getMyPredictions(
    @CurrentUser() user: AuthUser,
    @Param('matchweekId', ParseUUIDPipe) matchweekId: string,
  ) {
    return this.prisma.userPrediction.findMany({
      where: { userId: user.id, prediction: { matchweekId } },
      include: {
        prediction: {
          select: { id: true, question: true, category: true, options: true, deadline: true, status: true },
        },
      },
    });
  }

  @Get('results/:matchweekId')
  @ApiOperation({ summary: 'Get scored results after matches end' })
  async getMatchweekResults(
    @CurrentUser() user: AuthUser,
    @Param('matchweekId', ParseUUIDPipe) matchweekId: string,
  ) {
    // Fetch the user's predictions where the prediction status is RESOLVED
    return this.prisma.userPrediction.findMany({
      where: { 
        userId: user.id, 
        prediction: { matchweekId, status: 'RESOLVED' } 
      },
      include: {
        prediction: {
          select: { 
            id: true, 
            question: true, 
            correctOption: true, 
            pointsValue: true,
            match: { select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true } }
          },
        },
      },
    });
  }
}