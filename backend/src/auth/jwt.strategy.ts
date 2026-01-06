import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ConfigValidationService } from '../common/config-validation.service';
import { JwtPayload, ValidatedUser } from './dto/auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigValidationService,
  ) {
    const config = configService.getConfig();

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token as string | null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
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
