import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Res, Req } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Get('csrf-token')
    getCsrfToken(@Req() req: Request) {
        // CSRF token is already in cookie, just return it for client convenience
        const token = req.cookies['csrf-token'];
        return { csrfToken: token };
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async signIn(@Body() signInDto: Record<string, any>, @Res({ passthrough: true }) res: Response) {
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
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        // Blacklist the current token
        await this.authService.revokeToken(req.user);

        res.clearCookie('access_token');
        return { message: 'Logged out successfully' };
    }

    @Get('validate')
    @UseGuards(JwtAuthGuard)
    validate(@Req() req: Request) {
        return { valid: true, user: req.user };
    }
}
