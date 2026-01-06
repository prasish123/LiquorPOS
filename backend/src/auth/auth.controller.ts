import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf-token')
  @ApiOperation({
    summary: 'Get CSRF token',
    description:
      'Retrieve the CSRF token for use in state-changing requests. The token is also set as a cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token retrieved successfully',
    schema: {
      example: {
        csrfToken: 'a1b2c3d4e5f6...',
      },
    },
  })
  getCsrfToken(@Req() req: Request) {
    // CSRF token is already in cookie, just return it for client convenience
    const token = req.cookies['csrf-token'] as string | undefined;
    return { csrfToken: token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ strict: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with username and password. Returns user info and sets JWT in HttpOnly cookie. Rate limited to 5 attempts per minute.',
  })
  @ApiSecurity('CSRF')
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'john.doe',
          firstName: 'John',
          lastName: 'Doe',
          role: 'cashier',
        },
        jti: 'jwt-token-id-123',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts - Rate limit exceeded (5 attempts/minute)',
  })
  async signIn(@Body() signInDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(signInDto);

    // Set JWT in HttpOnly cookie
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    // Return user info and jti for potential client-side tracking
    return { user: result.user, jti: result.jti };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout the current user, revoke JWT token, and clear authentication cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Blacklist the current token
    const user = (req as Request & { user?: any }).user;
    if (user) {
      await this.authService.revokeToken(user);
    }

    res.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  @Get('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Validate JWT token',
    description: 'Validate the current JWT token and return user information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      example: {
        valid: true,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'john.doe',
          role: 'cashier',
          jti: 'jwt-token-id-123',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  validate(@Req() req: Request) {
    return { valid: true, user: req.user };
  }
}
