import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';

async function bootstrap() {
  // HTTPS configuration for production
  const httpsOptions = process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH ? {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  } : undefined;

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Enable cookie parser
  app.use(cookieParser());

  // Request logging middleware for audit trail
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const user = req.user?.username || 'anonymous';

      // Log format: [timestamp] METHOD /path STATUS duration user IP
      console.log(
        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms ${user} ${ip}`
      );

      // For critical operations, log to audit table (orders, payments, inventory changes)
      if (originalUrl.startsWith('/orders') && method !== 'GET') {
        // Audit logging handled by order-orchestrator
      }
    });

    next();
  });

  // CSRF Protection - Double Submit Cookie Pattern
  app.use((req: any, res: any, next: any) => {
    // Set CSRF token cookie if not present
    if (!req.cookies['csrf-token']) {
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
      if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/csrf-token')) {
        return next();
      }

      const cookieToken = req.cookies['csrf-token'];
      const headerToken = req.headers['x-csrf-token'];

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

  // Enable CORS with environment-based origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

  if (allowedOrigins.length === 0) {
    console.warn('⚠️  WARNING: ALLOWED_ORIGINS not configured. CORS will reject all cross-origin requests.');
    console.warn('    Set ALLOWED_ORIGINS in .env (e.g., ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174)');
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
