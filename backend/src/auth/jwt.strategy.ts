import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

        // Fail fast in production if JWT_SECRET not set
        if (process.env.NODE_ENV === 'production' && jwtSecret === 'your-secret-key-change-in-production') {
            throw new Error('JWT_SECRET must be set in production environment');
        }

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request?.cookies?.access_token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        // Check if token is blacklisted
        if (payload.jti) {
            const isBlacklisted = await this.authService.isTokenBlacklisted(payload.jti);
            if (isBlacklisted) {
                throw new UnauthorizedException('Token has been revoked');
            }
        }

        return {
            id: payload.sub,
            username: payload.username,
            role: payload.role,
            jti: payload.jti,
        };
    }
}
