// src/modules/users/api/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UpdateMeUseCase } from '../application/update-me.use-case';
import { DeleteMeUseCase } from '../application/delete-me.use-case';
import { updateMeSchema } from './dto/users.dto';
import type { UpdateMeDto } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth('onside-jwt')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly updateMe: UpdateMeUseCase,
    private readonly deleteMe: DeleteMeUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Current user profile.' })
  getMe(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Put('me')
  @UsePipes(new ZodValidationPipe(updateMeSchema))
  @ApiOperation({ summary: 'Update my display name and/or avatar' })
  @ApiBody({
    description: 'Fields to update. At least one must be provided.',
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Goziem Offer', minLength: 1, maxLength: 50 },
        avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.onside.app/avatars/abc.png' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated user profile.' })
  @ApiResponse({ status: 400, description: 'No fields provided or invalid values.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ) {
    return this.updateMe.execute(user.id, dto);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete my account (soft delete)' })
  @ApiResponse({ status: 204, description: 'Account deleted. All sessions invalidated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async deleteMyAccount(@CurrentUser() user: AuthUser) {
    await this.deleteMe.execute(user.id);
  }
}