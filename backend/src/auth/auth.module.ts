import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { RedisModule } from '../redis/redis.module';
import { ConfigValidationService } from '../common/config-validation.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigValidationService],
      useFactory: (configService: ConfigValidationService) => {
        const config = configService.getConfig();
        return {
          secret: config.JWT_SECRET,
          signOptions: { expiresIn: '8h' },
        };
      },
    }),
    RedisModule,
  ],
  providers: [AuthService, PrismaService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
