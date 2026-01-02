import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ERROR_METADATA, ErrorCodeMetadata } from './error-codes';

/**
 * Standardized Error Response Format
 *
 * This format is consistent across all API responses and provides:
 * - User-facing message (safe to display to end users)
 * - Error code for programmatic handling
 * - HTTP status code
 * - Timestamp for debugging
 * - Request ID for tracing
 * - Optional validation errors
 * - Optional additional context
 */
export interface ErrorResponse {
  /** User-facing error message (safe to display) */
  message: string;

  /** Machine-readable error code */
  code: ErrorCode;

  /** HTTP status code */
  statusCode: number;

  /** ISO timestamp when error occurred */
  timestamp: string;

  /** Request path that caused the error */
  path: string;

  /** Request ID for tracing (correlation ID) */
  requestId?: string;

  /** Validation errors (for 400 Bad Request) */
  validationErrors?: ValidationError[];

  /** Additional context (only in development mode) */
  details?: Record<string, any>;

  /** Stack trace (only in development mode) */
  stack?: string;
}

/**
 * Validation Error Detail
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraints?: Record<string, string>;
}

/**
 * Options for creating an AppException
 */
export interface AppExceptionOptions {
  userMessage?: string;
  internalMessage?: string;
  validationErrors?: ValidationError[];
  context?: Record<string, any>;
  cause?: Error;
}

/**
 * Base Application Exception
 *
 * All custom exceptions should extend this class.
 * Provides standardized error handling with:
 * - Error codes
 * - User-facing vs internal messages
 * - Validation errors
 * - Additional context
 */
export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly internalMessage: string;
  public readonly metadata: ErrorCodeMetadata;
  public readonly validationErrors?: ValidationError[];
  public readonly context?: Record<string, any>;
  public readonly isRetryable: boolean;

  constructor(code: ErrorCode, options?: AppExceptionOptions) {
    const metadata = ERROR_METADATA[code];
    const userMessage = options?.userMessage || metadata.userMessage;
    const internalMessage =
      options?.internalMessage || metadata.internalMessage;

    super(
      {
        message: userMessage,
        code,
        statusCode: metadata.httpStatus,
      },
      metadata.httpStatus,
    );

    this.code = code;
    this.userMessage = userMessage;
    this.internalMessage = internalMessage;
    this.metadata = metadata;
    this.validationErrors = options?.validationErrors;
    this.context = options?.context;
    this.isRetryable = metadata.retryable;

    // Maintain proper stack trace
    if (options?.cause) {
      this.stack = options.cause.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the name for better error identification
    this.name = `AppException[${code}]`;
  }

  /**
   * Convert exception to standardized error response
   */
  toErrorResponse(path: string, requestId?: string): ErrorResponse {
    const response: ErrorResponse = {
      message: this.userMessage,
      code: this.code,
      statusCode: this.metadata.httpStatus,
      timestamp: new Date().toISOString(),
      path,
      requestId,
    };

    if (this.validationErrors && this.validationErrors.length > 0) {
      response.validationErrors = this.validationErrors;
    }

    // Include details and stack in development mode
    if (process.env.NODE_ENV === 'development') {
      if (this.context) {
        response.details = this.context;
      }
      if (this.stack) {
        response.stack = this.stack;
      }
    }

    return response;
  }

  /**
   * Get internal log message with context
   */
  getLogMessage(): string {
    const parts = [this.internalMessage];

    if (this.context) {
      parts.push(`Context: ${JSON.stringify(this.context)}`);
    }

    if (this.validationErrors) {
      parts.push(`Validation errors: ${JSON.stringify(this.validationErrors)}`);
    }

    return parts.join(' | ');
  }
}

// ============================================================================
// CONVENIENCE EXCEPTION CLASSES
// ============================================================================

/**
 * Authentication Exception (401)
 */
export class AuthenticationException extends AppException {
  constructor(
    code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS,
    options?: AppExceptionOptions,
  ) {
    super(code, options);
  }
}

/**
 * Authorization Exception (403)
 */
export class AuthorizationException extends AppException {
  constructor(
    code: ErrorCode = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
    options?: AppExceptionOptions,
  ) {
    super(code, options);
  }
}

/**
 * Not Found Exception (404)
 */
export class NotFoundException extends AppException {
  constructor(
    code: ErrorCode,
    resourceType: string,
    resourceId?: string,
    options?: Omit<AppExceptionOptions, 'context'>,
  ) {
    super(code, {
      ...options,
      context: {
        resourceType,
        resourceId,
        ...(options as any)?.context,
      },
    });
  }
}

/**
 * Validation Exception (400)
 */
export class ValidationException extends AppException {
  constructor(
    code: ErrorCode = ErrorCode.VALIDATION_FAILED,
    validationErrors: ValidationError[],
    options?: Omit<AppExceptionOptions, 'validationErrors'>,
  ) {
    super(code, {
      ...options,
      validationErrors,
    });
  }
}

/**
 * Conflict Exception (409)
 */
export class ConflictException extends AppException {
  constructor(
    code: ErrorCode,
    conflictingResource?: string,
    options?: Omit<AppExceptionOptions, 'context'>,
  ) {
    super(code, {
      ...options,
      context: {
        conflictingResource,
        ...(options as any)?.context,
      },
    });
  }
}

/**
 * Business Logic Exception (400/409)
 */
export class BusinessLogicException extends AppException {
  constructor(code: ErrorCode, options?: AppExceptionOptions) {
    super(code, options);
  }
}

/**
 * External Service Exception (502/503/504)
 */
export class ExternalServiceException extends AppException {
  constructor(
    code: ErrorCode,
    serviceName: string,
    options?: Omit<AppExceptionOptions, 'context'>,
  ) {
    super(code, {
      ...options,
      context: {
        serviceName,
        ...(options as any)?.context,
      },
    });
  }
}

/**
 * Internal Server Exception (500)
 */
export class InternalServerException extends AppException {
  constructor(
    code: ErrorCode = ErrorCode.SYSTEM_INTERNAL_ERROR,
    options?: AppExceptionOptions,
  ) {
    super(code, options);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a validation exception from class-validator errors
 */
export function createValidationException(
  classValidatorErrors: any[],
): ValidationException {
  const validationErrors: ValidationError[] = classValidatorErrors.map(
    (error) => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
      value: error.value,
      constraints: error.constraints,
    }),
  );

  return new ValidationException(ErrorCode.VALIDATION_FAILED, validationErrors);
}

/**
 * Check if an error is an AppException
 */
export function isAppException(error: any): error is AppException {
  return error instanceof AppException;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (isAppException(error)) {
    return error.isRetryable;
  }
  return false;
}

/**
 * Convert any error to AppException
 */
export function toAppException(error: any): AppException {
  if (isAppException(error)) {
    return error;
  }

  // Convert standard NestJS exceptions
  if (error instanceof HttpException) {
    const status = error.getStatus();
    const response = error.getResponse();
    const message =
      typeof response === 'string' ? response : (response as any).message;

    // Map HTTP status to error code
    let code: ErrorCode;
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        code = ErrorCode.AUTH_TOKEN_INVALID;
        break;
      case HttpStatus.FORBIDDEN:
        code = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS;
        break;
      case HttpStatus.NOT_FOUND:
        code = ErrorCode.SYSTEM_INTERNAL_ERROR; // Generic, should be more specific
        break;
      case HttpStatus.BAD_REQUEST:
        code = ErrorCode.VALIDATION_FAILED;
        break;
      case HttpStatus.CONFLICT:
        code = ErrorCode.SYSTEM_INTERNAL_ERROR; // Generic
        break;
      default:
        code = ErrorCode.SYSTEM_INTERNAL_ERROR;
    }

    return new AppException(code, {
      userMessage: message,
      internalMessage: message,
      cause: error,
    });
  }

  // Convert generic errors
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new InternalServerException(ErrorCode.SYSTEM_INTERNAL_ERROR, {
    internalMessage: errorMessage,
    cause: error instanceof Error ? error : undefined,
  });
}
