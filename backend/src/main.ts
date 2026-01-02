import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigValidationService } from './common/config-validation.service';
import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // CRITICAL: Validate environment variables BEFORE creating the app
  // This ensures we fail fast if configuration is invalid
  logger.log('Validating environment configuration...');
  const configValidator = new ConfigValidationService();
  const config = configValidator.validateAndThrow();
  logger.log('Environment validation complete');

  // HTTPS configuration for production
  const httpsOptions =
    config.SSL_KEY_PATH && config.SSL_CERT_PATH
      ? {
          key: fs.readFileSync(config.SSL_KEY_PATH),
          cert: fs.readFileSync(config.SSL_CERT_PATH),
        }
      : undefined;

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Enable cookie parser
  app.use(cookieParser());

  // Request logging middleware for audit trail
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const user =
      (req as Request & { user?: { username?: string } }).user?.username ||
      'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      // Log format: [timestamp] METHOD /path STATUS duration user IP
      console.log(
        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms ${user} ${ip}`,
      );

      // For critical operations, log to audit table (orders, payments, inventory changes)
      if (originalUrl.startsWith('/orders') && method !== 'GET') {
        // Audit logging handled by order-orchestrator
      }
    });

    next();
  });

  // CSRF Protection - Double Submit Cookie Pattern
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Set CSRF token cookie if not present
    const cookies = req.cookies as Record<string, string> | undefined;
    if (!cookies || !cookies['csrf-token']) {
      const token = randomBytes(32).toString('hex');
      res.cookie('csrf-token', token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }

    // Validate CSRF token on state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // Exempt auth endpoints (pre-authentication)
      if (
        req.path.startsWith('/auth/login') ||
        req.path.startsWith('/auth/csrf-token')
      ) {
        return next();
      }

      const cookieToken = cookies?.['csrf-token'];
      const headerToken = req.headers['x-csrf-token'] as string | undefined;

      if (!cookieToken || cookieToken !== headerToken) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      }
    }
    next();
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS with validated origins
  const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((origin) =>
    origin.trim(),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = config.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Application failed to start');
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(errorMessage);
  process.exit(1);
});
