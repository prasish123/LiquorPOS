import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger.service';
import {
  AppException,
  ErrorResponse,
  toAppException,
  isAppException,
} from '../errors/app-exception';
import { ErrorCode } from '../errors/error-codes';

/**
 * Global Exception Filter
 *
 * Catches all exceptions and converts them to standardized error responses.
 *
 * Features:
 * - Standardized error format
 * - User-facing vs internal messages
 * - Request correlation IDs
 * - Comprehensive logging
 * - Development vs production modes
 * - Stack traces in development
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService('AppExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get request ID from headers or generate one
    const requestId = this.getRequestId(request);

    // Convert to AppException
    const appException = this.convertToAppException(exception);

    // Get standardized error response
    const errorResponse = appException.toErrorResponse(request.url, requestId);

    // Log the error
    this.logError(appException, request, requestId);

    // Send response
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Convert any exception to AppException
   */
  private convertToAppException(exception: unknown): AppException {
    // Already an AppException
    if (isAppException(exception)) {
      return exception;
    }

    // HTTP Exception (NestJS built-in)
    if (exception instanceof HttpException) {
      return this.convertHttpException(exception);
    }

    // Generic Error
    if (exception instanceof Error) {
      return this.convertGenericError(exception);
    }

    // Unknown exception type
    return new AppException(ErrorCode.SYSTEM_INTERNAL_ERROR, {
      internalMessage: `Unknown exception type: ${typeof exception}`,
      context: { exception: String(exception) },
    });
  }

  /**
   * Convert NestJS HttpException to AppException
   */
  private convertHttpException(exception: HttpException): AppException {
    const status = exception.getStatus();
    const response = exception.getResponse();

    // Extract message
    let message: string;
    let validationErrors: any[] | undefined;

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      message = (response as any).message || exception.message;
      validationErrors = (response as any).validationErrors;
    } else {
      message = exception.message;
    }

    // Map status to error code
    const code = this.mapStatusToErrorCode(status);

    return new AppException(code, {
      userMessage: message,
      internalMessage: message,
      validationErrors,
      cause: exception,
    });
  }

  /**
   * Convert generic Error to AppException
   */
  private convertGenericError(error: Error): AppException {
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return new AppException(ErrorCode.VALIDATION_FAILED, {
        internalMessage: error.message,
        cause: error,
      });
    }

    if (error.name === 'UnauthorizedError') {
      return new AppException(ErrorCode.AUTH_TOKEN_INVALID, {
        internalMessage: error.message,
        cause: error,
      });
    }

    // Generic internal error
    return new AppException(ErrorCode.SYSTEM_INTERNAL_ERROR, {
      internalMessage: error.message,
      cause: error,
    });
  }

  /**
   * Map HTTP status to error code
   */
  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_TOKEN_INVALID;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.SYSTEM_INTERNAL_ERROR; // Generic, should be more specific
      case HttpStatus.CONFLICT:
        return ErrorCode.SYSTEM_INTERNAL_ERROR; // Generic
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.SYSTEM_RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.SYSTEM_INTERNAL_ERROR;
      case HttpStatus.BAD_GATEWAY:
        return ErrorCode.INTEGRATION_EXTERNAL_SERVICE_ERROR;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SYSTEM_SERVICE_UNAVAILABLE;
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorCode.INTEGRATION_CONEXXUS_TIMEOUT;
      default:
        return ErrorCode.SYSTEM_INTERNAL_ERROR;
    }
  }

  /**
   * Get request ID from headers or generate one
   */
  private getRequestId(request: Request): string {
    // Check common request ID headers
    const requestId =
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      request.headers['x-trace-id'];

    if (requestId && typeof requestId === 'string') {
      return requestId;
    }

    // Generate a simple request ID
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(exception: AppException, request: Request, requestId: string): void {
    const logContext = {
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      code: exception.code,
      statusCode: exception.metadata.httpStatus,
      category: exception.metadata.category,
      retryable: exception.isRetryable,
      ...exception.context,
    };

    // Determine log level based on status code and category
    const statusCode = exception.metadata.httpStatus;
    const category = exception.metadata.category;

    if (statusCode >= 500 || category === 'server') {
      // Server errors - ERROR level
      this.logger.error(exception.getLogMessage(), exception.stack, logContext);
    } else if (statusCode === 429 || category === 'external') {
      // Rate limits and external errors - WARN level
      this.logger.warn(exception.getLogMessage(), logContext);
    } else {
      // Client errors - DEBUG level (don't clutter logs with client mistakes)
      this.logger.debug(exception.getLogMessage(), logContext);
    }
  }
}
