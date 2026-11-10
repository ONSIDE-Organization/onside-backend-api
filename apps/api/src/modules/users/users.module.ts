// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { UsersController } from './api/users.controller';
import { UpdateMeUseCase } from './application/update-me.use-case';
import { DeleteMeUseCase } from './application/delete-me.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UpdateMeUseCase, DeleteMeUseCase],
})
export class UsersModule {}