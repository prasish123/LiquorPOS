import { ConexxusHttpClient } from './conexxus-http.client';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('ConexxusHttpClient', () => {
  let client: ConexxusHttpClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    // Create client with test config
    client = new ConexxusHttpClient({
      baseURL: 'https://api.test.conexxus.com',
      apiKey: 'test-api-key',
      timeout: 5000,
      retries: 2,
      retryDelay: 100,
    });

    // Mock axios
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('fetchInventoryItems', () => {
    it('should fetch inventory items successfully', async () => {
      const mockItems = [
        { sku: 'TEST001', name: 'Test Product 1', price: 19.99 },
        { sku: 'TEST002', name: 'Test Product 2', price: 29.99 },
      ];

      mockAxios.onGet('/api/v1/inventory/items').reply(200, {
        success: true,
        data: mockItems,
        timestamp: new Date().toISOString(),
      });

      const items = await client.fetchInventoryItems();

      expect(items).toEqual(mockItems);
      expect(items).toHaveLength(2);
    });

    it('should handle empty inventory', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(200, {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      const items = await client.fetchInventoryItems();

      expect(items).toEqual([]);
      expect(items).toHaveLength(0);
    });

    it('should throw error on API failure', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(200, {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });

      await expect(client.fetchInventoryItems()).rejects.toThrow(
        'Failed to fetch inventory items',
      );
    });

    it('should handle network errors', async () => {
      mockAxios.onGet('/api/v1/inventory/items').networkError();

      await expect(client.fetchInventoryItems()).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      mockAxios.onGet('/api/v1/inventory/items').timeout();

      await expect(client.fetchInventoryItems()).rejects.toThrow();
    });
  });

  describe('pushSalesData', () => {
    it('should push sales data successfully', async () => {
      const salesData = {
        date: '2026-01-02',
        locationId: 'loc-001',
        transactions: [
          {
            id: 'txn-001',
            timestamp: '2026-01-02T10:00:00Z',
            total: 49.98,
            items: [
              { sku: 'TEST001', quantity: 2, price: 19.99 },
              { sku: 'TEST002', quantity: 1, price: 9.99 },
            ],
          },
        ],
      };

      mockAxios.onPost('/api/v1/sales/push').reply(200, {
        success: true,
        timestamp: new Date().toISOString(),
      });

      await expect(client.pushSalesData(salesData)).resolves.not.toThrow();
    });

    it('should throw error on push failure', async () => {
      const salesData = {
        date: '2026-01-02',
        locationId: 'loc-001',
        transactions: [],
      };

      mockAxios.onPost('/api/v1/sales/push').reply(200, {
        success: false,
        error: 'Invalid data format',
        timestamp: new Date().toISOString(),
      });

      await expect(client.pushSalesData(salesData)).rejects.toThrow(
        'Failed to push sales data',
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockAxios.onGet('/api/v1/health').reply(200, {
        success: true,
        data: { status: 'ok' },
        timestamp: new Date().toISOString(),
      });

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockAxios.onGet('/api/v1/health').reply(200, {
        success: true,
        data: { status: 'degraded' },
        timestamp: new Date().toISOString(),
      });

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false on network error', async () => {
      mockAxios.onGet('/api/v1/health').networkError();

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return success when connection is good', async () => {
      mockAxios.onGet('/api/v1/health').reply(200, {
        success: true,
        data: { status: 'ok' },
        timestamp: new Date().toISOString(),
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should return failure when connection fails', async () => {
      mockAxios.onGet('/api/v1/health').networkError();

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
      expect(result.latency).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(401);

      await expect(client.fetchInventoryItems()).rejects.toThrow(
        'authentication failed',
      );
    });

    it('should handle 403 forbidden errors', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(403);

      await expect(client.fetchInventoryItems()).rejects.toThrow(
        'access forbidden',
      );
    });

    it('should handle 404 not found errors', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(404);

      await expect(client.fetchInventoryItems()).rejects.toThrow(
        'endpoint not found',
      );
    });

    it('should handle 429 rate limit errors', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(429);

      await expect(client.fetchInventoryItems()).rejects.toThrow(
        'rate limit exceeded',
      );
    });

    it('should handle 500 server errors', async () => {
      mockAxios.onGet('/api/v1/inventory/items').reply(500);

      await expect(client.fetchInventoryItems()).rejects.toThrow(
        'server error',
      );
    });
  });

  describe('configuration', () => {
    it('should use environment variables', () => {
      process.env.CONEXXUS_API_URL = 'https://custom.api.com';
      process.env.CONEXXUS_API_KEY = 'custom-key';
      process.env.CONEXXUS_TIMEOUT = '10000';
      process.env.CONEXXUS_RETRIES = '5';

      const customClient = new ConexxusHttpClient();
      const config = customClient.getConfig();

      expect(config.baseURL).toBe('https://custom.api.com');
      expect(config.apiKey).toBe('custom-key');
      expect(config.timeout).toBe(10000);
      expect(config.retries).toBe(5);

      // Cleanup
      delete process.env.CONEXXUS_API_URL;
      delete process.env.CONEXXUS_API_KEY;
      delete process.env.CONEXXUS_TIMEOUT;
      delete process.env.CONEXXUS_RETRIES;
    });

    it('should use default values when env vars not set', () => {
      const defaultClient = new ConexxusHttpClient();
      const config = defaultClient.getConfig();

      expect(config.baseURL).toBeDefined();
      expect(config.timeout).toBe(30000);
      expect(config.retries).toBe(3);
    });
  });
});
