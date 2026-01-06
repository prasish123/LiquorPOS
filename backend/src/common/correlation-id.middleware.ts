import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { LoggerService } from './logger.service';

/**
 * Middleware to add correlation ID to each request
 * Enables request tracing across services and logs
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Get correlation ID from header or generate new one
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

    // Set in response header for client tracking
    res.setHeader('X-Correlation-Id', correlationId);

    // Store in CLS namespace for logging
    const namespace = LoggerService.getNamespace();
    namespace.run(() => {
      LoggerService.setCorrelationId(correlationId);
      next();
    });
  }
}
