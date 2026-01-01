import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { RedisModule } from '../redis/redis.module';

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Fail fast in production if JWT_SECRET not set
if (process.env.NODE_ENV === 'production' && jwtSecret === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET must be set in production environment');
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '8h' },
    }),
    RedisModule,
  ],
  providers: [AuthService, PrismaService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
