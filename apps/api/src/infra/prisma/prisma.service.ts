
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
      errorFormat: 'minimal',
    });
  }


  async onModuleInit() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    await this.$connect();
    await this.$queryRaw`SELECT 1`;

    this.logger.log('✅ PostgreSQL database connected successfully');
  } catch (error) {
    this.logger.error('❌ PostgreSQL database connection failed', error);
    throw error;
  }
}

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}