import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { LoginDto, LoginResponse, JwtPayload, UserPayload, ValidatedUser } from './dto/auth.dto';
import { User } from '@prisma/client';
import { AuthenticationException, ErrorCode } from '../common/errors';

type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async validateUser(username: string, pass: string): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new AuthenticationException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const jti = randomBytes(16).toString('hex');
    const payload: JwtPayload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      jti, // Unique token identifier for revocation
    };

    const userPayload: UserPayload = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      jti,
      user: userPayload,
    };
  }

  async revokeToken(user: ValidatedUser): Promise<void> {
    // Blacklist token by jti for 8 hours (token expiration time)
    if (user.jti) {
      await this.redisService.set(`blacklist:${user.jti}`, '1', 8 * 60 * 60);
    }
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redisService.get(`blacklist:${jti}`);
    return result !== null;
  }
}
