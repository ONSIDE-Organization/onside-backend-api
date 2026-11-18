import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@ApiTags('Matchweeks')
@ApiBearerAuth('onside-jwt')
@Controller({ path: 'fixtures', version: '1' })
export class MatchweeksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current active matchweek and fixtures' })
  async getCurrentMatchweek() {
    return this.prisma.matchweek.findFirst({
      where: { status: { in: ['UPCOMING', 'LIVE'] } },
      orderBy: { weekNumber: 'asc' },
      include: { 
        matches: { orderBy: { kickoff: 'asc' } },
        predictions: {
          select: { id: true, question: true, options: true, deadline: true, category: true }
        }
      },
    });
  }

  @Get('matchweek/:id')
  @ApiOperation({ summary: 'Get fixtures and predictions for a specific matchweek' })
  async getMatchweek(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.matchweek.findUnique({
      where: { id },
      include: { 
        matches: { orderBy: { kickoff: 'asc' } },
        predictions: {
          select: { id: true, question: true, options: true, deadline: true, category: true }
        }
      },
    });
  }
}