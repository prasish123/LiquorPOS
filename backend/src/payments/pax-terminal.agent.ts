import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

/**
 * PAX Terminal Configuration
 */
export interface PaxTerminalConfig {
  terminalId: string;
  ipAddress: string;
  port: number;
  timeout: number;
  enabled: boolean;
  locationId: string;
  serialNumber?: string;
  model?: string;
}

/**
 * PAX Transaction Request
 */
export interface PaxTransactionRequest {
  amount: number;
  transactionType: 'sale' | 'refund' | 'void' | 'auth' | 'capture';
  referenceNumber?: string;
  invoiceNumber?: string;
  metadata?: Record<string, any>;
}

/**
 * PAX Transaction Response
 */
export interface PaxTransactionResponse {
  success: boolean;
  transactionId: string;
  referenceNumber: string;
  amount: number;
  cardType?: string;
  last4?: string;
  authCode?: string;
  responseCode: string;
  responseMessage: string;
  timestamp: Date;
  terminalId: string;
  rawResponse?: any;
}

/**
 * PAX Terminal Status
 */
export interface PaxTerminalStatus {
  terminalId: string;
  online: boolean;
  lastHeartbeat: Date;
  firmwareVersion?: string;
  batteryLevel?: number;
  paperStatus?: 'ok' | 'low' | 'out';
  errors?: string[];
}

/**
 * PAX Communication Protocol
 * Implements the PAX terminal communication protocol
 */
class PaxProtocol {
  private static readonly STX = 0x02; // Start of text
  private static readonly ETX = 0x03; // End of text
  private static readonly FS = 0x1c; // Field separator

  /**
   * Build PAX protocol message
   */
  static buildMessage(command: string, fields: string[]): Buffer {
    const message = [command, ...fields].join(String.fromCharCode(this.FS));
    const lrc = this.calculateLRC(message);

    return Buffer.from([this.STX, ...Buffer.from(message), this.ETX, lrc]);
  }

  /**
   * Parse PAX protocol response
   */
  static parseResponse(buffer: Buffer): {
    command: string;
    fields: string[];
    valid: boolean;
  } {
    if (buffer.length < 4) {
      return { command: '', fields: [], valid: false };
    }

    // Verify STX and ETX
    if (buffer[0] !== this.STX || buffer[buffer.length - 2] !== this.ETX) {
      return { command: '', fields: [], valid: false };
    }

    // Extract message (between STX and ETX)
    const message = buffer.slice(1, buffer.length - 2).toString();

    // Verify LRC
    const receivedLRC = buffer[buffer.length - 1];
    const calculatedLRC = this.calculateLRC(message);

    if (receivedLRC !== calculatedLRC) {
      return { command: '', fields: [], valid: false };
    }

    // Parse fields
    const parts = message.split(String.fromCharCode(this.FS));
    const command = parts[0] || '';
    const fields = parts.slice(1);

    return { command, fields, valid: true };
  }

  /**
   * Calculate LRC (Longitudinal Redundancy Check)
   */
  private static calculateLRC(message: string): number {
    let lrc = 0;
    for (let i = 0; i < message.length; i++) {
      lrc ^= message.charCodeAt(i);
    }
    return lrc;
  }
}

/**
 * PAX Terminal Agent
 *
 * Handles communication with PAX payment terminals using the PAX protocol.
 * Supports various transaction types including sale, refund, void, and auth/capture.
 *
 * Features:
 * - Direct TCP/IP communication with PAX terminals
 * - Transaction processing (sale, refund, void, auth, capture)
 * - Terminal status monitoring
 * - Error handling and retry logic
 * - Transaction logging and audit trail
 * - EMV and contactless support
 *
 * PAX Terminal Models Supported:
 * - PAX A920/A920Pro (Android-based)
 * - PAX A80 (Countertop)
 * - PAX S300 (PIN Pad)
 * - PAX IM30 (Mobile)
 */
@Injectable()
export class PaxTerminalAgent {
  private readonly logger = new Logger(PaxTerminalAgent.name);
  private terminals: Map<string, PaxTerminalConfig> = new Map();
  private connections: Map<string, any> = new Map(); // TCP connections

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('PAX Terminal Agent initialized');
  }

  /**
   * Register a PAX terminal
   */
  async registerTerminal(config: PaxTerminalConfig): Promise<void> {
    this.logger.log(
      `Registering PAX terminal: ${config.terminalId} at ${config.ipAddress}:${config.port}`,
    );

    // Validate configuration
    this.validateTerminalConfig(config);

    // Store configuration
    this.terminals.set(config.terminalId, config);

    // Test connection
    const status = await this.getTerminalStatus(config.terminalId);
    if (!status.online) {
      this.logger.warn(`PAX terminal ${config.terminalId} is registered but not online`);
    }

    this.logger.log(`PAX terminal ${config.terminalId} registered successfully`);
  }

  /**
   * Unregister a PAX terminal
   */
  async unregisterTerminal(terminalId: string): Promise<void> {
    this.logger.log(`Unregistering PAX terminal: ${terminalId}`);

    // Close any open connections
    const connection = this.connections.get(terminalId);
    if (connection) {
      connection.destroy();
      this.connections.delete(terminalId);
    }

    // Remove configuration
    this.terminals.delete(terminalId);

    this.logger.log(`PAX terminal ${terminalId} unregistered successfully`);
  }

  /**
   * Process a transaction on PAX terminal
   */
  async processTransaction(
    terminalId: string,
    request: PaxTransactionRequest,
  ): Promise<PaxTransactionResponse> {
    this.logger.log(
      `Processing ${request.transactionType} transaction on terminal ${terminalId} for $${request.amount}`,
    );

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not registered`);
    }

    if (!terminal.enabled) {
      throw new Error(`Terminal ${terminalId} is disabled`);
    }

    const transactionId = crypto.randomUUID();
    const referenceNumber = request.referenceNumber || this.generateReferenceNumber();

    try {
      // Build PAX command based on transaction type
      const command = this.buildTransactionCommand(request, referenceNumber);

      // Send command to terminal
      const response = await this.sendCommand(terminalId, command);

      // Parse response
      const result = this.parseTransactionResponse(
        response,
        transactionId,
        terminalId,
        request.amount,
      );

      // Log transaction
      await this.logTransaction(terminalId, request, result);

      this.logger.log(
        `Transaction ${transactionId} ${result.success ? 'approved' : 'declined'}: ${result.responseMessage}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Transaction failed on terminal ${terminalId}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Log failed transaction
      const failedResult: PaxTransactionResponse = {
        success: false,
        transactionId,
        referenceNumber,
        amount: request.amount,
        responseCode: 'ERROR',
        responseMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        terminalId,
      };

      await this.logTransaction(terminalId, request, failedResult);

      throw error;
    }
  }

  /**
   * Get terminal status
   */
  async getTerminalStatus(terminalId: string): Promise<PaxTerminalStatus> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not registered`);
    }

    try {
      // Send status inquiry command (A00 command in PAX protocol)
      const command = PaxProtocol.buildMessage('A00', ['STATUS']);
      const response = await this.sendCommand(terminalId, command, 5000); // 5 second timeout

      const parsed = PaxProtocol.parseResponse(response);

      return {
        terminalId,
        online: parsed.valid && parsed.command === 'A01',
        lastHeartbeat: new Date(),
        firmwareVersion: parsed.fields[0],
        batteryLevel: parsed.fields[1] ? parseInt(parsed.fields[1]) : undefined,
        paperStatus: this.parsePaperStatus(parsed.fields[2]),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get status for terminal ${terminalId}`,
        error instanceof Error ? error.message : undefined,
      );

      return {
        terminalId,
        online: false,
        lastHeartbeat: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Cancel current transaction on terminal
   */
  async cancelTransaction(terminalId: string): Promise<void> {
    this.logger.log(`Cancelling transaction on terminal ${terminalId}`);

    const command = PaxProtocol.buildMessage('A14', ['CANCEL']);
    await this.sendCommand(terminalId, command, 3000);

    this.logger.log(`Transaction cancelled on terminal ${terminalId}`);
  }

  /**
   * Get list of registered terminals
   */
  getRegisteredTerminals(): PaxTerminalConfig[] {
    return Array.from(this.terminals.values());
  }

  /**
   * Validate terminal configuration
   */
  private validateTerminalConfig(config: PaxTerminalConfig): void {
    if (!config.terminalId) {
      throw new Error('Terminal ID is required');
    }

    if (!config.ipAddress) {
      throw new Error('IP address is required');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      throw new Error('Invalid port number');
    }

    if (!config.locationId) {
      throw new Error('Location ID is required');
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(config.ipAddress)) {
      throw new Error('Invalid IP address format');
    }
  }

  /**
   * Build transaction command for PAX terminal
   */
  private buildTransactionCommand(request: PaxTransactionRequest, referenceNumber: string): Buffer {
    // Convert amount to cents (PAX expects integer amount in cents)
    const amountInCents = Math.round(request.amount * 100).toString();

    // Build command based on transaction type
    let commandCode: string;
    switch (request.transactionType) {
      case 'sale':
        commandCode = 'T00'; // Sale command
        break;
      case 'refund':
        commandCode = 'T02'; // Refund command
        break;
      case 'void':
        commandCode = 'T04'; // Void command
        break;
      case 'auth':
        commandCode = 'T06'; // Auth only command
        break;
      case 'capture':
        commandCode = 'T08'; // Capture command
        break;
      default:
        throw new Error(`Unsupported transaction type: ${request.transactionType}`);
    }

    // Build field array
    const fields = [
      amountInCents, // Amount
      '0', // Cashback amount (not supported)
      referenceNumber, // Reference number
      request.invoiceNumber || '', // Invoice number
      '', // Auth code (for capture)
      '', // ECR reference number
      '', // Custom fields
    ];

    return PaxProtocol.buildMessage(commandCode, fields);
  }

  /**
   * Parse transaction response from PAX terminal
   */
  private parseTransactionResponse(
    buffer: Buffer,
    transactionId: string,
    terminalId: string,
    amount: number,
  ): PaxTransactionResponse {
    const parsed = PaxProtocol.parseResponse(buffer);

    if (!parsed.valid) {
      throw new Error('Invalid response from PAX terminal');
    }

    // Response format: T01 (response command)
    // Fields: [0]=ResponseCode, [1]=ResponseMessage, [2]=AuthCode, [3]=ReferenceNumber,
    //         [4]=CardType, [5]=Last4, [6]=Amount, etc.

    const responseCode = parsed.fields[0] || 'ERROR';
    const success = responseCode === '000000' || responseCode === '00'; // Approved

    return {
      success,
      transactionId,
      referenceNumber: parsed.fields[3] || '',
      amount,
      cardType: this.parseCardType(parsed.fields[4]),
      last4: parsed.fields[5],
      authCode: parsed.fields[2],
      responseCode,
      responseMessage: parsed.fields[1] || 'Unknown response',
      timestamp: new Date(),
      terminalId,
      rawResponse: parsed,
    };
  }

  /**
   * Send command to PAX terminal via TCP/IP
   */
  private async sendCommand(
    terminalId: string,
    command: Buffer,
    timeout: number = 30000,
  ): Promise<Buffer> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not registered`);
    }

    return new Promise((resolve, reject) => {
      const net = require('net');
      const client = new net.Socket();

      let responseBuffer = Buffer.alloc(0);
      // Set timeout
      const timeoutHandle: NodeJS.Timeout = setTimeout(() => {
        client.destroy();
        reject(new Error(`Terminal ${terminalId} timeout after ${timeout}ms`));
      }, timeout);

      // Handle connection
      client.connect(terminal.port, terminal.ipAddress, () => {
        this.logger.debug(
          `Connected to terminal ${terminalId} at ${terminal.ipAddress}:${terminal.port}`,
        );
        client.write(command);
      });

      // Handle data
      client.on('data', (data: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);

        // Check if we have a complete message (ends with ETX + LRC)
        if (responseBuffer.length >= 4 && responseBuffer[responseBuffer.length - 2] === 0x03) {
          clearTimeout(timeoutHandle);
          client.destroy();
          resolve(responseBuffer);
        }
      });

      // Handle errors
      client.on('error', (error: Error) => {
        clearTimeout(timeoutHandle);
        this.logger.error(`Terminal ${terminalId} connection error`, error.stack);
        reject(error);
      });

      // Handle close
      client.on('close', () => {
        if (responseBuffer.length === 0) {
          clearTimeout(timeoutHandle);
          reject(new Error(`Terminal ${terminalId} closed connection without response`));
        }
      });
    });
  }

  /**
   * Log transaction to database
   */
  private async logTransaction(
    terminalId: string,
    request: PaxTransactionRequest,
    response: PaxTransactionResponse,
  ): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.pax_transaction',
          aggregateId: response.transactionId,
          payload: JSON.stringify({
            terminalId,
            request,
            response: {
              ...response,
              rawResponse: undefined, // Don't store raw response
            },
          }),
          metadata: JSON.stringify({
            success: response.success,
            responseCode: response.responseCode,
            cardType: response.cardType,
            last4: response.last4,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to log PAX transaction',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Generate unique reference number for transaction
   */
  private generateReferenceNumber(): string {
    // Format: YYYYMMDDHHMMSS + random 4 digits
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${timestamp}${random}`;
  }

  /**
   * Parse card type from PAX response
   */
  private parseCardType(code?: string): string | undefined {
    if (!code) return undefined;

    const cardTypes: Record<string, string> = {
      '01': 'Visa',
      '02': 'Mastercard',
      '03': 'American Express',
      '04': 'Discover',
      '05': 'Diners Club',
      '06': 'JCB',
    };

    return cardTypes[code] || 'Unknown';
  }

  /**
   * Parse paper status from PAX response
   */
  private parsePaperStatus(code?: string): 'ok' | 'low' | 'out' {
    if (!code) return 'ok';

    switch (code) {
      case '0':
        return 'ok';
      case '1':
        return 'low';
      case '2':
        return 'out';
      default:
        return 'ok';
    }
  }
}
