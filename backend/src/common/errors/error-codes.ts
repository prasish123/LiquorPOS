/**
 * Standardized Error Codes for POS-Omni Liquor POS
 *
 * Format: <MODULE>_<CATEGORY>_<SPECIFIC_ERROR>
 *
 * Modules:
 * - AUTH: Authentication and authorization
 * - ORDER: Order processing
 * - PRODUCT: Product management
 * - INVENTORY: Inventory management
 * - CUSTOMER: Customer management
 * - PAYMENT: Payment processing
 * - INTEGRATION: External integrations
 * - SYSTEM: System-level errors
 *
 * Categories:
 * - NOT_FOUND: Resource not found
 * - VALIDATION: Input validation failed
 * - CONFLICT: Resource conflict
 * - UNAUTHORIZED: Authentication failed
 * - FORBIDDEN: Authorization failed
 * - INTERNAL: Internal server error
 * - EXTERNAL: External service error
 */

export enum ErrorCode {
  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION (AUTH_*)
  // ============================================================================
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_REVOKED = 'AUTH_TOKEN_REVOKED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  AUTH_USER_INACTIVE = 'AUTH_USER_INACTIVE',
  AUTH_CSRF_TOKEN_MISSING = 'AUTH_CSRF_TOKEN_MISSING',
  AUTH_CSRF_TOKEN_INVALID = 'AUTH_CSRF_TOKEN_INVALID',
  AUTH_RATE_LIMIT_EXCEEDED = 'AUTH_RATE_LIMIT_EXCEEDED',

  // ============================================================================
  // ORDER PROCESSING (ORDER_*)
  // ============================================================================
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_VALIDATION_FAILED = 'ORDER_VALIDATION_FAILED',
  ORDER_EMPTY_CART = 'ORDER_EMPTY_CART',
  ORDER_TOO_MANY_ITEMS = 'ORDER_TOO_MANY_ITEMS',
  ORDER_INVALID_QUANTITY = 'ORDER_INVALID_QUANTITY',
  ORDER_INVALID_AMOUNT = 'ORDER_INVALID_AMOUNT',
  ORDER_AGE_VERIFICATION_REQUIRED = 'ORDER_AGE_VERIFICATION_REQUIRED',
  ORDER_AGE_VERIFICATION_FAILED = 'ORDER_AGE_VERIFICATION_FAILED',
  ORDER_IDEMPOTENCY_KEY_REQUIRED = 'ORDER_IDEMPOTENCY_KEY_REQUIRED',
  ORDER_IDEMPOTENCY_KEY_INVALID = 'ORDER_IDEMPOTENCY_KEY_INVALID',
  ORDER_PROCESSING_FAILED = 'ORDER_PROCESSING_FAILED',
  ORDER_ALREADY_COMPLETED = 'ORDER_ALREADY_COMPLETED',
  ORDER_ALREADY_REFUNDED = 'ORDER_ALREADY_REFUNDED',
  ORDER_CANNOT_BE_MODIFIED = 'ORDER_CANNOT_BE_MODIFIED',

  // ============================================================================
  // PRODUCT MANAGEMENT (PRODUCT_*)
  // ============================================================================
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_SKU_ALREADY_EXISTS = 'PRODUCT_SKU_ALREADY_EXISTS',
  PRODUCT_VALIDATION_FAILED = 'PRODUCT_VALIDATION_FAILED',
  PRODUCT_INVALID_CATEGORY = 'PRODUCT_INVALID_CATEGORY',
  PRODUCT_INVALID_PRICE = 'PRODUCT_INVALID_PRICE',
  PRODUCT_AGE_RESTRICTED = 'PRODUCT_AGE_RESTRICTED',
  PRODUCT_DISCONTINUED = 'PRODUCT_DISCONTINUED',

  // ============================================================================
  // INVENTORY MANAGEMENT (INVENTORY_*)
  // ============================================================================
  INVENTORY_NOT_FOUND = 'INVENTORY_NOT_FOUND',
  INVENTORY_INSUFFICIENT_STOCK = 'INVENTORY_INSUFFICIENT_STOCK',
  INVENTORY_INVALID_QUANTITY = 'INVENTORY_INVALID_QUANTITY',
  INVENTORY_INVALID_ADJUSTMENT = 'INVENTORY_INVALID_ADJUSTMENT',
  INVENTORY_ALREADY_RESERVED = 'INVENTORY_ALREADY_RESERVED',
  INVENTORY_RESERVATION_FAILED = 'INVENTORY_RESERVATION_FAILED',
  INVENTORY_RELEASE_FAILED = 'INVENTORY_RELEASE_FAILED',
  INVENTORY_LOCATION_MISMATCH = 'INVENTORY_LOCATION_MISMATCH',

  // ============================================================================
  // CUSTOMER MANAGEMENT (CUSTOMER_*)
  // ============================================================================
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  CUSTOMER_EMAIL_ALREADY_EXISTS = 'CUSTOMER_EMAIL_ALREADY_EXISTS',
  CUSTOMER_PHONE_ALREADY_EXISTS = 'CUSTOMER_PHONE_ALREADY_EXISTS',
  CUSTOMER_VALIDATION_FAILED = 'CUSTOMER_VALIDATION_FAILED',
  CUSTOMER_LOYALTY_INSUFFICIENT_POINTS = 'CUSTOMER_LOYALTY_INSUFFICIENT_POINTS',
  CUSTOMER_ACCOUNT_SUSPENDED = 'CUSTOMER_ACCOUNT_SUSPENDED',

  // ============================================================================
  // PAYMENT PROCESSING (PAYMENT_*)
  // ============================================================================
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  PAYMENT_INSUFFICIENT_FUNDS = 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_CARD_EXPIRED = 'PAYMENT_CARD_EXPIRED',
  PAYMENT_CARD_INVALID = 'PAYMENT_CARD_INVALID',
  PAYMENT_PROCESSOR_ERROR = 'PAYMENT_PROCESSOR_ERROR',
  PAYMENT_ALREADY_CAPTURED = 'PAYMENT_ALREADY_CAPTURED',
  PAYMENT_ALREADY_REFUNDED = 'PAYMENT_ALREADY_REFUNDED',
  PAYMENT_REFUND_FAILED = 'PAYMENT_REFUND_FAILED',
  PAYMENT_AMOUNT_MISMATCH = 'PAYMENT_AMOUNT_MISMATCH',
  PAYMENT_METHOD_NOT_SUPPORTED = 'PAYMENT_METHOD_NOT_SUPPORTED',

  // ============================================================================
  // LOCATION MANAGEMENT (LOCATION_*)
  // ============================================================================
  LOCATION_NOT_FOUND = 'LOCATION_NOT_FOUND',
  LOCATION_LICENSE_EXPIRED = 'LOCATION_LICENSE_EXPIRED',
  LOCATION_LICENSE_EXPIRING_SOON = 'LOCATION_LICENSE_EXPIRING_SOON',
  LOCATION_INACTIVE = 'LOCATION_INACTIVE',
  LOCATION_VALIDATION_FAILED = 'LOCATION_VALIDATION_FAILED',

  // ============================================================================
  // EXTERNAL INTEGRATIONS (INTEGRATION_*)
  // ============================================================================
  INTEGRATION_CONEXXUS_UNAVAILABLE = 'INTEGRATION_CONEXXUS_UNAVAILABLE',
  INTEGRATION_CONEXXUS_TIMEOUT = 'INTEGRATION_CONEXXUS_TIMEOUT',
  INTEGRATION_CONEXXUS_AUTH_FAILED = 'INTEGRATION_CONEXXUS_AUTH_FAILED',
  INTEGRATION_SYNC_FAILED = 'INTEGRATION_SYNC_FAILED',
  INTEGRATION_EXTERNAL_SERVICE_ERROR = 'INTEGRATION_EXTERNAL_SERVICE_ERROR',

  // ============================================================================
  // SYSTEM ERRORS (SYSTEM_*)
  // ============================================================================
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_DATABASE_ERROR = 'SYSTEM_DATABASE_ERROR',
  SYSTEM_CACHE_ERROR = 'SYSTEM_CACHE_ERROR',
  SYSTEM_CONFIGURATION_ERROR = 'SYSTEM_CONFIGURATION_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_MAINTENANCE_MODE = 'SYSTEM_MAINTENANCE_MODE',
  SYSTEM_RATE_LIMIT_EXCEEDED = 'SYSTEM_RATE_LIMIT_EXCEEDED',

  // ============================================================================
  // VALIDATION ERRORS (VALIDATION_*)
  // ============================================================================
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD_MISSING = 'VALIDATION_REQUIRED_FIELD_MISSING',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_UUID = 'VALIDATION_INVALID_UUID',
  VALIDATION_INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
  VALIDATION_INVALID_PHONE = 'VALIDATION_INVALID_PHONE',
}

/**
 * Error code metadata for better error messages
 */
export interface ErrorCodeMetadata {
  code: ErrorCode;
  httpStatus: number;
  userMessage: string;
  internalMessage: string;
  category: 'client' | 'server' | 'external';
  retryable: boolean;
}

/**
 * Error code metadata mapping
 */
export const ERROR_METADATA: Record<ErrorCode, ErrorCodeMetadata> = {
  // Authentication & Authorization
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
    code: ErrorCode.AUTH_INVALID_CREDENTIALS,
    httpStatus: 401,
    userMessage: 'Invalid username or password',
    internalMessage: 'Authentication failed: invalid credentials',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_TOKEN_EXPIRED]: {
    code: ErrorCode.AUTH_TOKEN_EXPIRED,
    httpStatus: 401,
    userMessage: 'Your session has expired. Please log in again',
    internalMessage: 'JWT token expired',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_TOKEN_INVALID]: {
    code: ErrorCode.AUTH_TOKEN_INVALID,
    httpStatus: 401,
    userMessage: 'Invalid authentication token',
    internalMessage: 'JWT token validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_TOKEN_REVOKED]: {
    code: ErrorCode.AUTH_TOKEN_REVOKED,
    httpStatus: 401,
    userMessage: 'Your session has been revoked. Please log in again',
    internalMessage: 'JWT token has been revoked',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: {
    code: ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
    httpStatus: 403,
    userMessage: 'You do not have permission to perform this action',
    internalMessage: 'User lacks required permissions',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_USER_NOT_FOUND]: {
    code: ErrorCode.AUTH_USER_NOT_FOUND,
    httpStatus: 404,
    userMessage: 'User account not found',
    internalMessage: 'User not found in database',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_USER_INACTIVE]: {
    code: ErrorCode.AUTH_USER_INACTIVE,
    httpStatus: 403,
    userMessage: 'Your account has been deactivated. Please contact support',
    internalMessage: 'User account is inactive',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.AUTH_CSRF_TOKEN_MISSING]: {
    code: ErrorCode.AUTH_CSRF_TOKEN_MISSING,
    httpStatus: 403,
    userMessage: 'Security token missing. Please refresh and try again',
    internalMessage: 'CSRF token not provided',
    category: 'client',
    retryable: true,
  },
  [ErrorCode.AUTH_CSRF_TOKEN_INVALID]: {
    code: ErrorCode.AUTH_CSRF_TOKEN_INVALID,
    httpStatus: 403,
    userMessage: 'Security token invalid. Please refresh and try again',
    internalMessage: 'CSRF token validation failed',
    category: 'client',
    retryable: true,
  },
  [ErrorCode.AUTH_RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
    httpStatus: 429,
    userMessage: 'Too many login attempts. Please try again in a few minutes',
    internalMessage: 'Authentication rate limit exceeded',
    category: 'client',
    retryable: true,
  },

  // Order Processing
  [ErrorCode.ORDER_NOT_FOUND]: {
    code: ErrorCode.ORDER_NOT_FOUND,
    httpStatus: 404,
    userMessage: 'Order not found',
    internalMessage: 'Order ID does not exist',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_VALIDATION_FAILED]: {
    code: ErrorCode.ORDER_VALIDATION_FAILED,
    httpStatus: 400,
    userMessage: 'Order validation failed. Please check your input',
    internalMessage: 'Order data validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_EMPTY_CART]: {
    code: ErrorCode.ORDER_EMPTY_CART,
    httpStatus: 400,
    userMessage: 'Cannot create order with empty cart',
    internalMessage: 'Order contains no items',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_TOO_MANY_ITEMS]: {
    code: ErrorCode.ORDER_TOO_MANY_ITEMS,
    httpStatus: 400,
    userMessage: 'Order contains too many items (maximum 100)',
    internalMessage: 'Order exceeds maximum item count',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_INVALID_QUANTITY]: {
    code: ErrorCode.ORDER_INVALID_QUANTITY,
    httpStatus: 400,
    userMessage: 'Invalid quantity specified',
    internalMessage: 'Order item quantity out of valid range',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_INVALID_AMOUNT]: {
    code: ErrorCode.ORDER_INVALID_AMOUNT,
    httpStatus: 400,
    userMessage: 'Invalid amount specified',
    internalMessage: 'Order amount out of valid range',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_AGE_VERIFICATION_REQUIRED]: {
    code: ErrorCode.ORDER_AGE_VERIFICATION_REQUIRED,
    httpStatus: 400,
    userMessage: 'Age verification required for alcohol purchase',
    internalMessage: 'Order contains age-restricted items without verification',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_AGE_VERIFICATION_FAILED]: {
    code: ErrorCode.ORDER_AGE_VERIFICATION_FAILED,
    httpStatus: 403,
    userMessage: 'Age verification failed. Customer must be 21 or older',
    internalMessage: 'Age verification check failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_IDEMPOTENCY_KEY_REQUIRED]: {
    code: ErrorCode.ORDER_IDEMPOTENCY_KEY_REQUIRED,
    httpStatus: 400,
    userMessage: 'Request ID required',
    internalMessage: 'Idempotency key not provided',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_IDEMPOTENCY_KEY_INVALID]: {
    code: ErrorCode.ORDER_IDEMPOTENCY_KEY_INVALID,
    httpStatus: 400,
    userMessage: 'Invalid request ID format',
    internalMessage: 'Idempotency key format invalid',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_PROCESSING_FAILED]: {
    code: ErrorCode.ORDER_PROCESSING_FAILED,
    httpStatus: 500,
    userMessage: 'Order processing failed. Please try again',
    internalMessage: 'Order orchestration failed',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.ORDER_ALREADY_COMPLETED]: {
    code: ErrorCode.ORDER_ALREADY_COMPLETED,
    httpStatus: 409,
    userMessage: 'Order has already been completed',
    internalMessage: 'Cannot modify completed order',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_ALREADY_REFUNDED]: {
    code: ErrorCode.ORDER_ALREADY_REFUNDED,
    httpStatus: 409,
    userMessage: 'Order has already been refunded',
    internalMessage: 'Cannot refund already refunded order',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.ORDER_CANNOT_BE_MODIFIED]: {
    code: ErrorCode.ORDER_CANNOT_BE_MODIFIED,
    httpStatus: 409,
    userMessage: 'Order cannot be modified in its current state',
    internalMessage: 'Order status does not allow modifications',
    category: 'client',
    retryable: false,
  },

  // Product Management
  [ErrorCode.PRODUCT_NOT_FOUND]: {
    code: ErrorCode.PRODUCT_NOT_FOUND,
    httpStatus: 404,
    userMessage: 'Product not found',
    internalMessage: 'Product ID or SKU does not exist',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PRODUCT_SKU_ALREADY_EXISTS]: {
    code: ErrorCode.PRODUCT_SKU_ALREADY_EXISTS,
    httpStatus: 409,
    userMessage: 'Product SKU already exists',
    internalMessage: 'Duplicate SKU in database',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PRODUCT_VALIDATION_FAILED]: {
    code: ErrorCode.PRODUCT_VALIDATION_FAILED,
    httpStatus: 400,
    userMessage: 'Product validation failed. Please check your input',
    internalMessage: 'Product data validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PRODUCT_INVALID_CATEGORY]: {
    code: ErrorCode.PRODUCT_INVALID_CATEGORY,
    httpStatus: 400,
    userMessage: 'Invalid product category',
    internalMessage: 'Product category not in allowed list',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PRODUCT_INVALID_PRICE]: {
    code: ErrorCode.PRODUCT_INVALID_PRICE,
    httpStatus: 400,
    userMessage: 'Invalid product price',
    internalMessage: 'Product price out of valid range',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PRODUCT_AGE_RESTRICTED]: {
    code: ErrorCode.PRODUCT_AGE_RESTRICTED,
    httpStatus: 403,
    userMessage: 'This product requires age verification',
    internalMessage: 'Product is age-restricted',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PRODUCT_DISCONTINUED]: {
    code: ErrorCode.PRODUCT_DISCONTINUED,
    httpStatus: 410,
    userMessage: 'This product has been discontinued',
    internalMessage: 'Product marked as discontinued',
    category: 'client',
    retryable: false,
  },

  // Inventory Management
  [ErrorCode.INVENTORY_NOT_FOUND]: {
    code: ErrorCode.INVENTORY_NOT_FOUND,
    httpStatus: 404,
    userMessage: 'Inventory record not found',
    internalMessage: 'Inventory ID does not exist',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.INVENTORY_INSUFFICIENT_STOCK]: {
    code: ErrorCode.INVENTORY_INSUFFICIENT_STOCK,
    httpStatus: 409,
    userMessage: 'Insufficient stock available',
    internalMessage: 'Inventory quantity below requested amount',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.INVENTORY_INVALID_QUANTITY]: {
    code: ErrorCode.INVENTORY_INVALID_QUANTITY,
    httpStatus: 400,
    userMessage: 'Invalid inventory quantity',
    internalMessage: 'Inventory quantity out of valid range',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.INVENTORY_INVALID_ADJUSTMENT]: {
    code: ErrorCode.INVENTORY_INVALID_ADJUSTMENT,
    httpStatus: 400,
    userMessage: 'Invalid inventory adjustment',
    internalMessage: 'Inventory adjustment would result in negative stock',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.INVENTORY_ALREADY_RESERVED]: {
    code: ErrorCode.INVENTORY_ALREADY_RESERVED,
    httpStatus: 409,
    userMessage: 'Inventory already reserved',
    internalMessage: 'Inventory reservation conflict',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.INVENTORY_RESERVATION_FAILED]: {
    code: ErrorCode.INVENTORY_RESERVATION_FAILED,
    httpStatus: 500,
    userMessage: 'Failed to reserve inventory. Please try again',
    internalMessage: 'Inventory reservation operation failed',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.INVENTORY_RELEASE_FAILED]: {
    code: ErrorCode.INVENTORY_RELEASE_FAILED,
    httpStatus: 500,
    userMessage: 'Failed to release inventory. Please try again',
    internalMessage: 'Inventory release operation failed',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.INVENTORY_LOCATION_MISMATCH]: {
    code: ErrorCode.INVENTORY_LOCATION_MISMATCH,
    httpStatus: 400,
    userMessage: 'Inventory location mismatch',
    internalMessage: 'Inventory location does not match order location',
    category: 'client',
    retryable: false,
  },

  // Customer Management
  [ErrorCode.CUSTOMER_NOT_FOUND]: {
    code: ErrorCode.CUSTOMER_NOT_FOUND,
    httpStatus: 404,
    userMessage: 'Customer not found',
    internalMessage: 'Customer ID does not exist',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.CUSTOMER_EMAIL_ALREADY_EXISTS]: {
    code: ErrorCode.CUSTOMER_EMAIL_ALREADY_EXISTS,
    httpStatus: 409,
    userMessage: 'Email address already registered',
    internalMessage: 'Duplicate customer email',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.CUSTOMER_PHONE_ALREADY_EXISTS]: {
    code: ErrorCode.CUSTOMER_PHONE_ALREADY_EXISTS,
    httpStatus: 409,
    userMessage: 'Phone number already registered',
    internalMessage: 'Duplicate customer phone',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.CUSTOMER_VALIDATION_FAILED]: {
    code: ErrorCode.CUSTOMER_VALIDATION_FAILED,
    httpStatus: 400,
    userMessage: 'Customer validation failed. Please check your input',
    internalMessage: 'Customer data validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.CUSTOMER_LOYALTY_INSUFFICIENT_POINTS]: {
    code: ErrorCode.CUSTOMER_LOYALTY_INSUFFICIENT_POINTS,
    httpStatus: 400,
    userMessage: 'Insufficient loyalty points',
    internalMessage: 'Customer loyalty points below required amount',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.CUSTOMER_ACCOUNT_SUSPENDED]: {
    code: ErrorCode.CUSTOMER_ACCOUNT_SUSPENDED,
    httpStatus: 403,
    userMessage: 'Customer account suspended. Please contact support',
    internalMessage: 'Customer account is suspended',
    category: 'client',
    retryable: false,
  },

  // Payment Processing
  [ErrorCode.PAYMENT_FAILED]: {
    code: ErrorCode.PAYMENT_FAILED,
    httpStatus: 402,
    userMessage:
      'Payment failed. Please try again or use a different payment method',
    internalMessage: 'Payment processing failed',
    category: 'external',
    retryable: true,
  },
  [ErrorCode.PAYMENT_DECLINED]: {
    code: ErrorCode.PAYMENT_DECLINED,
    httpStatus: 402,
    userMessage: 'Payment declined by card issuer',
    internalMessage: 'Payment declined by processor',
    category: 'external',
    retryable: false,
  },
  [ErrorCode.PAYMENT_INSUFFICIENT_FUNDS]: {
    code: ErrorCode.PAYMENT_INSUFFICIENT_FUNDS,
    httpStatus: 402,
    userMessage: 'Insufficient funds',
    internalMessage: 'Payment declined: insufficient funds',
    category: 'external',
    retryable: false,
  },
  [ErrorCode.PAYMENT_CARD_EXPIRED]: {
    code: ErrorCode.PAYMENT_CARD_EXPIRED,
    httpStatus: 402,
    userMessage: 'Card has expired',
    internalMessage: 'Payment card expired',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PAYMENT_CARD_INVALID]: {
    code: ErrorCode.PAYMENT_CARD_INVALID,
    httpStatus: 400,
    userMessage: 'Invalid card information',
    internalMessage: 'Payment card validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PAYMENT_PROCESSOR_ERROR]: {
    code: ErrorCode.PAYMENT_PROCESSOR_ERROR,
    httpStatus: 502,
    userMessage: 'Payment processor error. Please try again',
    internalMessage: 'Payment processor returned error',
    category: 'external',
    retryable: true,
  },
  [ErrorCode.PAYMENT_ALREADY_CAPTURED]: {
    code: ErrorCode.PAYMENT_ALREADY_CAPTURED,
    httpStatus: 409,
    userMessage: 'Payment already captured',
    internalMessage: 'Cannot capture already captured payment',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PAYMENT_ALREADY_REFUNDED]: {
    code: ErrorCode.PAYMENT_ALREADY_REFUNDED,
    httpStatus: 409,
    userMessage: 'Payment already refunded',
    internalMessage: 'Cannot refund already refunded payment',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PAYMENT_REFUND_FAILED]: {
    code: ErrorCode.PAYMENT_REFUND_FAILED,
    httpStatus: 500,
    userMessage: 'Refund failed. Please contact support',
    internalMessage: 'Payment refund operation failed',
    category: 'external',
    retryable: true,
  },
  [ErrorCode.PAYMENT_AMOUNT_MISMATCH]: {
    code: ErrorCode.PAYMENT_AMOUNT_MISMATCH,
    httpStatus: 400,
    userMessage: 'Payment amount mismatch',
    internalMessage: 'Payment amount does not match order total',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.PAYMENT_METHOD_NOT_SUPPORTED]: {
    code: ErrorCode.PAYMENT_METHOD_NOT_SUPPORTED,
    httpStatus: 400,
    userMessage: 'Payment method not supported',
    internalMessage: 'Unsupported payment method',
    category: 'client',
    retryable: false,
  },

  // Location Management
  [ErrorCode.LOCATION_NOT_FOUND]: {
    code: ErrorCode.LOCATION_NOT_FOUND,
    httpStatus: 404,
    userMessage: 'Location not found',
    internalMessage: 'Location ID does not exist',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.LOCATION_LICENSE_EXPIRED]: {
    code: ErrorCode.LOCATION_LICENSE_EXPIRED,
    httpStatus: 403,
    userMessage: 'Location liquor license has expired',
    internalMessage: 'Location license expired',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.LOCATION_LICENSE_EXPIRING_SOON]: {
    code: ErrorCode.LOCATION_LICENSE_EXPIRING_SOON,
    httpStatus: 200,
    userMessage: 'Location liquor license expiring soon',
    internalMessage: 'Location license expires within 90 days',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.LOCATION_INACTIVE]: {
    code: ErrorCode.LOCATION_INACTIVE,
    httpStatus: 403,
    userMessage: 'Location is inactive',
    internalMessage: 'Location marked as inactive',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.LOCATION_VALIDATION_FAILED]: {
    code: ErrorCode.LOCATION_VALIDATION_FAILED,
    httpStatus: 400,
    userMessage: 'Location validation failed. Please check your input',
    internalMessage: 'Location data validation failed',
    category: 'client',
    retryable: false,
  },

  // External Integrations
  [ErrorCode.INTEGRATION_CONEXXUS_UNAVAILABLE]: {
    code: ErrorCode.INTEGRATION_CONEXXUS_UNAVAILABLE,
    httpStatus: 503,
    userMessage: 'External system temporarily unavailable',
    internalMessage: 'Conexxus integration unavailable',
    category: 'external',
    retryable: true,
  },
  [ErrorCode.INTEGRATION_CONEXXUS_TIMEOUT]: {
    code: ErrorCode.INTEGRATION_CONEXXUS_TIMEOUT,
    httpStatus: 504,
    userMessage: 'External system timeout. Please try again',
    internalMessage: 'Conexxus integration timeout',
    category: 'external',
    retryable: true,
  },
  [ErrorCode.INTEGRATION_CONEXXUS_AUTH_FAILED]: {
    code: ErrorCode.INTEGRATION_CONEXXUS_AUTH_FAILED,
    httpStatus: 502,
    userMessage: 'External system authentication failed',
    internalMessage: 'Conexxus authentication failed',
    category: 'external',
    retryable: false,
  },
  [ErrorCode.INTEGRATION_SYNC_FAILED]: {
    code: ErrorCode.INTEGRATION_SYNC_FAILED,
    httpStatus: 500,
    userMessage: 'Synchronization failed. Please try again',
    internalMessage: 'Integration sync operation failed',
    category: 'external',
    retryable: true,
  },
  [ErrorCode.INTEGRATION_EXTERNAL_SERVICE_ERROR]: {
    code: ErrorCode.INTEGRATION_EXTERNAL_SERVICE_ERROR,
    httpStatus: 502,
    userMessage: 'External service error. Please try again',
    internalMessage: 'External service returned error',
    category: 'external',
    retryable: true,
  },

  // System Errors
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: {
    code: ErrorCode.SYSTEM_INTERNAL_ERROR,
    httpStatus: 500,
    userMessage: 'An unexpected error occurred. Please try again',
    internalMessage: 'Internal server error',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.SYSTEM_DATABASE_ERROR]: {
    code: ErrorCode.SYSTEM_DATABASE_ERROR,
    httpStatus: 500,
    userMessage: 'Database error. Please try again',
    internalMessage: 'Database operation failed',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.SYSTEM_CACHE_ERROR]: {
    code: ErrorCode.SYSTEM_CACHE_ERROR,
    httpStatus: 500,
    userMessage: 'Cache error. Please try again',
    internalMessage: 'Cache operation failed',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.SYSTEM_CONFIGURATION_ERROR]: {
    code: ErrorCode.SYSTEM_CONFIGURATION_ERROR,
    httpStatus: 500,
    userMessage: 'System configuration error. Please contact support',
    internalMessage: 'System configuration invalid',
    category: 'server',
    retryable: false,
  },
  [ErrorCode.SYSTEM_SERVICE_UNAVAILABLE]: {
    code: ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
    httpStatus: 503,
    userMessage: 'Service temporarily unavailable. Please try again',
    internalMessage: 'Service unavailable',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.SYSTEM_MAINTENANCE_MODE]: {
    code: ErrorCode.SYSTEM_MAINTENANCE_MODE,
    httpStatus: 503,
    userMessage: 'System under maintenance. Please try again later',
    internalMessage: 'System in maintenance mode',
    category: 'server',
    retryable: true,
  },
  [ErrorCode.SYSTEM_RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.SYSTEM_RATE_LIMIT_EXCEEDED,
    httpStatus: 429,
    userMessage: 'Too many requests. Please try again later',
    internalMessage: 'Rate limit exceeded',
    category: 'client',
    retryable: true,
  },

  // Validation Errors
  [ErrorCode.VALIDATION_FAILED]: {
    code: ErrorCode.VALIDATION_FAILED,
    httpStatus: 400,
    userMessage: 'Validation failed. Please check your input',
    internalMessage: 'Input validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING]: {
    code: ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING,
    httpStatus: 400,
    userMessage: 'Required field missing',
    internalMessage: 'Required field not provided',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.VALIDATION_INVALID_FORMAT]: {
    code: ErrorCode.VALIDATION_INVALID_FORMAT,
    httpStatus: 400,
    userMessage: 'Invalid format',
    internalMessage: 'Field format validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: {
    code: ErrorCode.VALIDATION_OUT_OF_RANGE,
    httpStatus: 400,
    userMessage: 'Value out of valid range',
    internalMessage: 'Field value out of range',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.VALIDATION_INVALID_UUID]: {
    code: ErrorCode.VALIDATION_INVALID_UUID,
    httpStatus: 400,
    userMessage: 'Invalid ID format',
    internalMessage: 'UUID validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.VALIDATION_INVALID_EMAIL]: {
    code: ErrorCode.VALIDATION_INVALID_EMAIL,
    httpStatus: 400,
    userMessage: 'Invalid email address',
    internalMessage: 'Email format validation failed',
    category: 'client',
    retryable: false,
  },
  [ErrorCode.VALIDATION_INVALID_PHONE]: {
    code: ErrorCode.VALIDATION_INVALID_PHONE,
    httpStatus: 400,
    userMessage: 'Invalid phone number',
    internalMessage: 'Phone format validation failed',
    category: 'client',
    retryable: false,
  },
};
