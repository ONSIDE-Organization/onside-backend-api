// src/modules/rivalries/api/rivalries.controller.ts
import { Body, Controller, Get, Param, Post, Put, Query, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateRivalryUseCase } from '../application/create-rivalry.use-case';
import { createRivalrySchema } from './dto/create-rivalry.dto';
import type { CreateRivalryDto } from './dto/create-rivalry.dto';

@ApiTags('Rivalries')
@ApiBearerAuth('onside-jwt')
@Controller({ path: 'rivalries', version: '1' })
export class RivalriesController {
  constructor(
    private readonly createRivalry: CreateRivalryUseCase,
    // Other use cases injected here...
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all my rivalries' })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'LIVE', 'PENDING', 'SETTLED'] })
  async getMyRivalries(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    // return this.getRivalries.execute(user.id, status);
    return [];
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createRivalrySchema))
  @ApiOperation({ summary: 'Create a new rivalry' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['opponentId', 'statement', 'category'],
      properties: {
        opponentId: { type: 'string', format: 'uuid' },
        statement: { type: 'string', example: 'Arsenal will win the league' },
        category: { type: 'string', example: 'TEAMS' },
        predictionId: { type: 'string', format: 'uuid', description: 'Optional if creating from Predict tab' },
      },
    },
  })
  async createNewRivalry(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRivalryDto,
  ) {
    return this.createRivalry.execute(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single rivalry detail' })
  async getRivalryDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // return this.getRivalryDetail.execute(user.id, id);
    return {};
  }

  @Put(':id/accept')
  @ApiOperation({ summary: 'Accept a rivalry' })
  async acceptRivalry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // return this.acceptRivalry.execute(user.id, id);
    return {};
  }

  @Put(':id/decline')
  @ApiOperation({ summary: 'Decline a rivalry' })
  async declineRivalry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // return this.declineRivalry.execute(user.id, id);
    return {};
  }
}