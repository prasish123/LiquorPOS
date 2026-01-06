import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigValidationService } from './common/config-validation.service';
import { LoggerService } from './common/logger.service';
import { getValidatedConfig } from './config/app.config';
import { validateEnvironment } from './common/env-validation';
import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new LoggerService('Bootstrap');

  // CRITICAL: Validate environment variables BEFORE creating the app
  // This ensures we fail fast if configuration is invalid
  logger.log('Validating environment configuration...');
  validateEnvironment(); // New comprehensive validation
  const configValidator = new ConfigValidationService();
  const config = configValidator.validateAndThrow();
  logger.log('Environment validation complete');

  // Validate application configuration (operational settings)
  logger.log('Validating application configuration...');
  try {
    const appConfig = getValidatedConfig();
    logger.log('Application configuration validated successfully');
    logger.log(
      `Configuration loaded: ${JSON.stringify({
        redis: { memoryCacheSize: appConfig.redis.memoryCacheSize },
        businessRules: {
          maxOrderQuantity: appConfig.businessRules.maxOrderQuantity,
        },
        backup: { schedule: appConfig.backup.schedule },
      })}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Application configuration validation failed');
    logger.error(errorMessage);
    throw error;
  }

  // HTTPS configuration for production
  const httpsOptions =
    config.SSL_KEY_PATH && config.SSL_CERT_PATH
      ? {
          key: fs.readFileSync(config.SSL_KEY_PATH),
          cert: fs.readFileSync(config.SSL_CERT_PATH),
        }
      : undefined;

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // CRITICAL: Raw body parser for Stripe webhooks
  // Must be registered BEFORE json parser to preserve raw body for signature verification
  app.use('/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));

  // Enable cookie parser
  app.use(cookieParser());

  // Security headers middleware (helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny', // Prevent clickjacking
      },
      noSniff: true, // Prevent MIME type sniffing
      xssFilter: true, // Enable XSS filter
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    }),
  );

  logger.log('Security headers configured (helmet)');

  // Request logging middleware for audit trail
  const requestLogger = new LoggerService('HTTP');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const user = (req as Request & { user?: { username?: string } }).user?.username || 'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      // Structured logging with metadata
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      const metadata = {
        method,
        path: originalUrl,
        statusCode,
        duration,
        user,
        ip,
      };

      if (logLevel === 'error') {
        requestLogger.error(message, undefined, metadata);
      } else if (logLevel === 'warn') {
        requestLogger.warn(message, metadata);
      } else {
        requestLogger.log(message, metadata);
      }

      // For critical operations, log to audit table (orders, payments, inventory changes)
      if (originalUrl.startsWith('/orders') && method !== 'GET') {
        // Audit logging handled by order-orchestrator
      }
    });

    next();
  });

  // CSRF Protection - Double Submit Cookie Pattern
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for webhooks (they use signature verification instead)
    if (req.path.startsWith('/webhooks/')) {
      return next();
    }

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
      // Only exempt GET endpoint for CSRF token retrieval
      // Login endpoint MUST include CSRF token for security
      if (req.path.startsWith('/auth/csrf-token')) {
        return next();
      }

      const cookieToken = cookies?.['csrf-token'];
      const headerToken = req.headers['x-csrf-token'] as string | undefined;

      if (!cookieToken || cookieToken !== headerToken) {
        return res.status(403).json({
          message: 'Invalid CSRF token',
          error: 'CSRF_TOKEN_MISMATCH',
        });
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
  const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('POS-Omni Liquor POS API')
    .setDescription(
      'REST API for POS-Omni liquor store point-of-sale system. ' +
        'Supports order processing, inventory management, customer management, and external integrations.',
    )
    .setVersion('1.0.0')
    .setContact(
      'POS-Omni Support',
      'https://github.com/pos-omni/liquor-pos',
      'support@pos-omni.example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('auth', 'Authentication and authorization')
    .addTag('orders', 'Order processing and management')
    .addTag('products', 'Product catalog and search')
    .addTag('inventory', 'Inventory tracking and management')
    .addTag('customers', 'Customer management')
    .addTag('webhooks', 'Webhook endpoints for external integrations')
    .addTag('health', 'Health check endpoints')
    .addTag('integrations', 'External system integrations')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT',
    )
    .addCookieAuth('csrf-token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'csrf-token',
      description: 'CSRF protection token (automatically set)',
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-csrf-token',
        description: 'CSRF token from cookie (required for POST/PUT/PATCH/DELETE)',
      },
      'CSRF',
    )
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.pos-omni.example.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'POS-Omni API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
    },
  });

  logger.log(`📚 API Documentation available at: http://localhost:${config.PORT || 3000}/api/docs`);

  const port = config.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);

  // Setup global error handlers for production safety
  setupGlobalErrorHandlers(app, logger);
}

/**
 * Setup global error handlers to catch unhandled errors
 * This prevents silent failures and ensures all errors are logged
 */
function setupGlobalErrorHandlers(app: any, logger: LoggerService) {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('🔥 UNCAUGHT EXCEPTION - Application will shutdown', error.stack, {
      name: error.name,
      message: error.message,
      type: 'uncaughtException',
    });

    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error(
      '🔥 UNHANDLED REJECTION - Potential memory leak',
      reason instanceof Error ? reason.stack : String(reason),
      {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise),
        type: 'unhandledRejection',
      },
    );
  });

  // Handle SIGTERM for graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('📴 SIGTERM received - Starting graceful shutdown');

    try {
      await app.close();
      logger.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error(
        '❌ Error during graceful shutdown',
        error instanceof Error ? error.stack : String(error),
      );
      process.exit(1);
    }
  });

  // Handle SIGINT (Ctrl+C) for graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('📴 SIGINT received - Starting graceful shutdown');

    try {
      await app.close();
      logger.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error(
        '❌ Error during graceful shutdown',
        error instanceof Error ? error.stack : String(error),
      );
      process.exit(1);
    }
  });

  logger.log('✅ Global error handlers configured');
}

bootstrap().catch((error: unknown) => {
  const logger = new LoggerService('Bootstrap');
  logger.error('❌ Application failed to start');
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(errorMessage, stack);
  process.exit(1);
});
