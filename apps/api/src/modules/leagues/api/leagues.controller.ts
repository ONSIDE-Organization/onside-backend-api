// // src/modules/leagues/api/leagues.controller.ts
import { Body, Controller, Get, Param, Post, Query, ParseUUIDPipe, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateLeagueUseCase } from '../application/create-league.use-case';
import { JoinLeagueUseCase } from '../application/join-league.use-case';
import { GetLeaderboardUseCase } from '../application/get-leaderboard.use-case';
import { createLeagueSchema, joinLeagueSchema } from './dto/league.dto';
import type { CreateLeagueDto, JoinLeagueDto } from './dto/league.dto';

@ApiTags('Leagues')
@ApiBearerAuth('onside-jwt')
@Controller({ path: 'leagues', version: '1' })
export class LeaguesController {
  constructor(
    private readonly createLeague: CreateLeagueUseCase,
    private readonly joinLeague: JoinLeagueUseCase,
    private readonly getLeaderboard: GetLeaderboardUseCase,
  ) {}

  // @Post()
  // // @UsePipes(new ZodValidationPipe(createLeagueSchema))
  // @ApiOperation({ summary: 'Create a private league' })
  // async create(@CurrentUser() user: AuthUser,
  // //  @Body() dto: CreateLeagueDto
  //     @Body(new ZodValidationPipe(createLeagueSchema)) dto: CreateLeagueDto,
  
  // ) {
  //   return this.createLeague.execute(user.id, dto);
  // }

  @Post()
@ApiOperation({ summary: 'Create a private league' })
@ApiBody({
  schema: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        example: 'My Private League',
        minLength: 3,
        maxLength: 50,
      },
    },
  },
})
@UsePipes(new ZodValidationPipe(createLeagueSchema))
async create(
  @CurrentUser() user: AuthUser,
  @Body() dto: CreateLeagueDto,
) {
  return this.createLeague.execute(user.id, dto);
}

  @Get('me')
  @ApiOperation({ summary: 'Get all leagues I belong to' })
  async getMyLeagues(@CurrentUser() user: AuthUser) {
    // Implementation pending or simple Prisma query
    return [];
  }

  @Post('join')
  @UsePipes(new ZodValidationPipe(joinLeagueSchema))
  @ApiOperation({ summary: 'Join a league via invite code' })
  async join(@CurrentUser() user: AuthUser, @Body() dto: JoinLeagueDto) {
    return this.joinLeague.execute(user.id, dto.inviteCode);
  }

  @Get(':leagueId/leaderboard')
  @ApiOperation({ summary: 'Get ranked scores for a league' })
  @ApiQuery({ name: 'matchweekId', required: false, description: 'Filter leaderboard by a specific matchweek' })
  async leaderboard(
    @CurrentUser() user: AuthUser,
    @Param('leagueId', ParseUUIDPipe) leagueId: string,
    @Query('matchweekId') matchweekId?: string,
  ) {
    return this.getLeaderboard.execute(leagueId, matchweekId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get league members and their active picks' })
  async members(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    // Implementation pending
    return [];
  }
}