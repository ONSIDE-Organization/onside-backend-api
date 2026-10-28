// import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// /**
//  * Placeholder adapter. Add PrismaClient inheritance and lifecycle hooks after
//  * installing the Prisma version selected for the project.
//  */
// @Injectable()
// export class PrismaService implements OnModuleInit, OnModuleDestroy {
//   async onModuleInit(): Promise<void> {
//     // TODO: connect PrismaClient.
//   }

//   async onModuleDestroy(): Promise<void> {
//     // TODO: disconnect PrismaClient.
//   }
// }
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
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}