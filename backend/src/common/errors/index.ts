/**
 * Centralized Error Handling Exports
 *
 * Import everything you need for error handling from this single file:
 *
 * ```typescript
 * import {
 *   ErrorCode,
 *   AppException,
 *   NotFoundException,
 *   ValidationException,
 *   // ... etc
 * } from '@/common/errors';
 * ```
 */

// Error codes and metadata
export { ErrorCode, ERROR_METADATA } from './error-codes';

export type { ErrorCodeMetadata } from './error-codes';

// Exception classes
export {
  AppException,
  AuthenticationException,
  AuthorizationException,
  NotFoundException,
  ValidationException,
  ConflictException,
  BusinessLogicException,
  ExternalServiceException,
  InternalServerException,
  createValidationException,
  isAppException,
  isRetryableError,
  toAppException,
} from './app-exception';

export type {
  ErrorResponse,
  ValidationError,
  AppExceptionOptions,
} from './app-exception';

// Exception filter
export { AppExceptionFilter } from '../filters/app-exception.filter';
