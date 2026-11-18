// src/infra/sports-api/sports-api.module.ts
import { Global, Module } from '@nestjs/common';
import { SportsApiClient } from './sports-api.client';

@Global()
@Module({
  providers: [SportsApiClient],
  exports: [SportsApiClient],
})
export class SportsApiModule {}