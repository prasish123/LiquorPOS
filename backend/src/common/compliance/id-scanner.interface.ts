/**
 * ID Scanner Hardware Integration Interface
 *
 * This module provides interfaces and adapters for integrating with
 * various ID scanning hardware and software solutions.
 *
 * Supported Devices:
 * - IDScan.net devices
 * - Tokenworks scanners
 * - Honeywell barcode scanners
 * - Generic PDF417/2D barcode readers
 */

export interface ScannedIDData {
  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  dateOfBirth: Date;
  age: number;

  // ID Information
  idNumber: string;
  idType: 'drivers_license' | 'state_id' | 'passport' | 'military_id' | 'other';
  issuingState?: string;
  issuingCountry: string;
  issueDate?: Date;
  expirationDate: Date;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Physical Description
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;
  sex?: 'M' | 'F' | 'X';

  // Verification
  isExpired: boolean;
  isValid: boolean;
  validationErrors: string[];

  // Metadata
  scanTimestamp: Date;
  scannerType: string;
  rawData?: string; // Encrypted raw scan data
}

export interface IDScannerConfig {
  deviceType: 'idscan' | 'tokenworks' | 'honeywell' | 'generic';
  deviceId?: string;
  apiKey?: string;
  apiEndpoint?: string;
  timeout: number; // milliseconds
  retryAttempts: number;
  validateExpiration: boolean;
  validateAge: boolean;
  minimumAge: number;
  storeRawData: boolean;
  encryptData: boolean;
}

export interface IDScanResult {
  success: boolean;
  data?: ScannedIDData;
  error?: string;
  validationWarnings: string[];
}

/**
 * Base interface for ID scanner implementations
 */
export interface IIDScanner {
  /**
   * Initialize the scanner device
   */
  initialize(config: IDScannerConfig): Promise<void>;

  /**
   * Scan an ID and return parsed data
   */
  scan(): Promise<IDScanResult>;

  /**
   * Validate scanned ID data
   */
  validate(data: ScannedIDData): Promise<IDScanResult>;

  /**
   * Check if device is connected and ready
   */
  isReady(): Promise<boolean>;

  /**
   * Disconnect from device
   */
  disconnect(): Promise<void>;
}

/**
 * Mock ID Scanner for testing and development
 */
export class MockIDScanner implements IIDScanner {
  private config?: IDScannerConfig;
  private ready = false;

  async initialize(config: IDScannerConfig): Promise<void> {
    this.config = config;
    this.ready = true;
    console.log('Mock ID Scanner initialized');
  }

  async scan(): Promise<IDScanResult> {
    if (!this.ready) {
      return {
        success: false,
        error: 'Scanner not initialized',
        validationWarnings: [],
      };
    }

    // Simulate scanning delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock data
    const mockData: ScannedIDData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-15'),
      age: 34,
      idNumber: 'D123-456-78-901-0',
      idType: 'drivers_license',
      issuingState: 'FL',
      issuingCountry: 'USA',
      issueDate: new Date('2020-01-15'),
      expirationDate: new Date('2028-01-15'),
      address: '123 Main St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
      height: '5\'10"',
      weight: '180',
      eyeColor: 'BRN',
      hairColor: 'BRN',
      sex: 'M',
      isExpired: false,
      isValid: true,
      validationErrors: [],
      scanTimestamp: new Date(),
      scannerType: 'mock',
    };

    return {
      success: true,
      data: mockData,
      validationWarnings: [],
    };
  }

  async validate(data: ScannedIDData): Promise<IDScanResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check expiration
    if (this.config?.validateExpiration) {
      if (data.isExpired || data.expirationDate < new Date()) {
        errors.push('ID is expired');
      }
    }

    // Check age
    if (this.config?.validateAge) {
      const minimumAge = this.config.minimumAge || 21;
      if (data.age < minimumAge) {
        errors.push(`Customer must be at least ${minimumAge} years old`);
      }
    }

    // Check if ID is from valid state
    if (data.issuingCountry !== 'USA' && data.idType !== 'passport') {
      warnings.push('International ID - verify acceptance policy');
    }

    return {
      success: errors.length === 0,
      data,
      error: errors.join('; '),
      validationWarnings: warnings,
    };
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    this.ready = false;
    console.log('Mock ID Scanner disconnected');
  }
}

/**
 * IDScan.net API Integration
 */
export class IDScanNetScanner implements IIDScanner {
  private config?: IDScannerConfig;
  private ready = false;

  async initialize(config: IDScannerConfig): Promise<void> {
    if (!config.apiKey || !config.apiEndpoint) {
      throw new Error('API key and endpoint required for IDScan.net');
    }

    this.config = config;

    // Test connection
    try {
      // In production, this would make an actual API call
      this.ready = true;
    } catch (error) {
      throw new Error(`Failed to initialize IDScan.net: ${error}`);
    }
  }

  async scan(): Promise<IDScanResult> {
    if (!this.ready || !this.config) {
      return {
        success: false,
        error: 'Scanner not initialized',
        validationWarnings: [],
      };
    }

    // In production, this would:
    // 1. Capture image from scanner
    // 2. Send to IDScan.net API
    // 3. Parse response
    // 4. Return structured data

    throw new Error(
      'IDScan.net integration not yet implemented - use MockIDScanner for development',
    );
  }

  async validate(data: ScannedIDData): Promise<IDScanResult> {
    // IDScan.net provides validation as part of scan
    return {
      success: data.isValid,
      data,
      error: data.validationErrors.join('; '),
      validationWarnings: [],
    };
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    this.ready = false;
  }
}

/**
 * Generic PDF417 Barcode Scanner
 * Works with most 2D barcode readers
 */
export class PDF417Scanner implements IIDScanner {
  private config?: IDScannerConfig;
  private ready = false;

  async initialize(config: IDScannerConfig): Promise<void> {
    this.config = config;
    this.ready = true;
  }

  async scan(): Promise<IDScanResult> {
    if (!this.ready) {
      return {
        success: false,
        error: 'Scanner not initialized',
        validationWarnings: [],
      };
    }

    // In production, this would:
    // 1. Read barcode data from scanner
    // 2. Parse AAMVA standard format
    // 3. Extract fields according to spec
    // 4. Return structured data

    throw new Error(
      'PDF417 scanner integration not yet implemented - use MockIDScanner for development',
    );
  }

  async validate(data: ScannedIDData): Promise<IDScanResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (data.isExpired) {
      errors.push('ID is expired');
    }

    if (this.config?.validateAge && data.age < (this.config.minimumAge || 21)) {
      errors.push(`Customer must be at least ${this.config.minimumAge || 21} years old`);
    }

    return {
      success: errors.length === 0,
      data,
      error: errors.join('; '),
      validationWarnings: warnings,
    };
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    this.ready = false;
  }
}

/**
 * Factory for creating ID scanner instances
 */
export class IDScannerFactory {
  static create(config: IDScannerConfig): IIDScanner {
    switch (config.deviceType) {
      case 'idscan':
        return new IDScanNetScanner();
      case 'generic':
      case 'honeywell':
      case 'tokenworks':
        return new PDF417Scanner();
      default:
        return new MockIDScanner();
    }
  }
}

/**
 * ID Scanner Service for NestJS integration
 */
export class IDScannerService {
  private scanner?: IIDScanner;
  private config?: IDScannerConfig;

  async initialize(config: IDScannerConfig): Promise<void> {
    this.config = config;
    this.scanner = IDScannerFactory.create(config);
    await this.scanner.initialize(config);
  }

  async scanID(): Promise<IDScanResult> {
    if (!this.scanner) {
      throw new Error('Scanner not initialized');
    }

    const result = await this.scanner.scan();

    // Additional validation if configured
    if (result.success && result.data && this.config) {
      return await this.scanner.validate(result.data);
    }

    return result;
  }

  async isReady(): Promise<boolean> {
    if (!this.scanner) return false;
    return await this.scanner.isReady();
  }

  async disconnect(): Promise<void> {
    if (this.scanner) {
      await this.scanner.disconnect();
    }
  }
}
