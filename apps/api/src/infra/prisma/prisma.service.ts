import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

/**
 * Placeholder adapter. Add PrismaClient inheritance and lifecycle hooks after
 * installing the Prisma version selected for the project.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    // TODO: connect PrismaClient.
  }

  async onModuleDestroy(): Promise<void> {
    // TODO: disconnect PrismaClient.
  }
}
