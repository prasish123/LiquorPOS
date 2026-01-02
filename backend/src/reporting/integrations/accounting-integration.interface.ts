/**
 * Accounting Integration Interface
 *
 * Defines the contract for integrating with accounting systems like QuickBooks and Xero.
 * Implementations should handle authentication, data synchronization, and error handling.
 */

export interface AccountingIntegration {
  /**
   * Initialize connection to accounting system
   */
  connect(credentials: AccountingCredentials): Promise<void>;

  /**
   * Sync transactions to accounting system
   */
  syncTransactions(transactions: TransactionExport[]): Promise<SyncResult>;

  /**
   * Sync inventory to accounting system
   */
  syncInventory(inventory: InventoryExport[]): Promise<SyncResult>;

  /**
   * Get chart of accounts
   */
  getChartOfAccounts(): Promise<AccountCategory[]>;

  /**
   * Create invoice in accounting system
   */
  createInvoice(invoice: InvoiceExport): Promise<string>;

  /**
   * Get sync status
   */
  getSyncStatus(): Promise<SyncStatus>;
}

export interface AccountingCredentials {
  provider: 'quickbooks' | 'xero' | 'other';
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  realmId?: string; // QuickBooks company ID
  tenantId?: string; // Xero organization ID
}

export interface TransactionExport {
  transactionId: string;
  date: Date;
  customerName?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    accountCode?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  referenceNumber?: string;
}

export interface InventoryExport {
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  category?: string;
  accountCode?: string;
}

export interface InvoiceExport {
  customerName: string;
  customerEmail?: string;
  invoiceDate: Date;
  dueDate?: Date;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface AccountCategory {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  code?: string;
  parentId?: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors?: Array<{
    recordId: string;
    error: string;
  }>;
  syncedAt: Date;
}

export interface SyncStatus {
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  status: 'idle' | 'syncing' | 'error';
  pendingRecords: number;
  errorMessage?: string;
}

