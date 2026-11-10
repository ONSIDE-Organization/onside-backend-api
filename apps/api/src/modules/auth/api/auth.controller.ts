// src/modules/auth/api/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UsePipes
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { LoginUseCase } from '../application/login.use-case';
import { RegisterUseCase } from '../application/register.use-case';
import { CheckUsernameUseCase } from '../application/check-username.use-case';
import { loginSchema, registerSchema, checkUsernameSchema } from './dto/auth.dto';
import type { LoginDto, RegisterDto, CheckUsernameDto } from './dto/auth.dto';
import { LogoutUseCase } from '../application/logout.use-case';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly register: RegisterUseCase,
    private readonly checkUsername: CheckUsernameUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) { }

  @Public()
  @Post('register')
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(registerSchema))
  @ApiOperation({ summary: 'Create new user account' })
  @ApiBody({
    description: 'Registration payload containing Firebase token and user details',
    schema: {
      type: 'object',
      required: ['idToken', 'username', 'displayName'],
      properties: {
        idToken: { type: 'string', description: 'Firebase ID token from client SDK', example: 'eyJhbGciOi...' },
        username: { type: 'string', description: 'Unique handle (3-20 chars, alphanumeric)', example: 'goziem' },
        displayName: { type: 'string', description: 'User\'s full name', example: 'Goziem Offer' },
        avatarUrl: { type: 'string', nullable: true, description: 'Optional URL to avatar', example: 'https://...' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User successfully created and logged in.' })
  @ApiResponse({ status: 409, description: 'Username or email already taken.' })
  async registerUser(@Body() dto: RegisterDto) {
    return this.register.execute(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({ summary: 'Log in, return JWT' })
  @ApiBody({
    description: 'Login payload containing Firebase token',
    schema: {
      type: 'object',
      required: ['idToken'],
      properties: {
        idToken: { type: 'string', description: 'Firebase ID token from client SDK', example: 'eyJhbGciOi...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful. Returns Onside JWT.' })
  @ApiResponse({ status: 404, description: 'User not registered (needs to sign up).' })
  async loginWithFirebase(@Body() dto: LoginDto) {
    return this.login.execute(dto.idToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth('onside-jwt')
  @ApiOperation({ summary: 'Invalidate all sessions for the current user' })
  @ApiResponse({ status: 204, description: 'All tokens for this user are now invalid.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  async logout(@CurrentUser() user: AuthUser) {
    await this.logoutUseCase.execute(user.id);
  }

  @Public()
  @Get('check-username')
  @UsePipes(new ZodValidationPipe(checkUsernameSchema))
  @ApiOperation({ summary: 'Check if a username is available (UI support)' })
  @ApiQuery({
    name: 'username',
    required: true,
    type: String,
    description: 'The username to check for availability',
    example: 'goziem',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns availability status.',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean', example: true },
        username: { type: 'string', example: 'goziem' }
      }
    }
  })
  async isUsernameAvailable(@Query() query: CheckUsernameDto) {
    return this.checkUsername.execute(query.username);
  }

  @Get('me')
  @ApiBearerAuth('onside-jwt')
  @ApiOperation({ summary: 'Get my profile (alias for /users/me)' })
  @ApiResponse({
    status: 200,
    description: 'Returns current authenticated user profile.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid-1234' },
        username: { type: 'string', example: 'goziem' },
        displayName: { type: 'string', example: 'Goziem Offer' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@CurrentUser() user: AuthUser) {
    return user;
  }
}