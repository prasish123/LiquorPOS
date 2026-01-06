import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryAgent } from './inventory.agent';
import { PrismaService } from '../../prisma.service';
import { OrderItemDto } from '../dto/order.dto';

describe('InventoryAgent', () => {
  let agent: InventoryAgent;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    inventory: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAgent,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    agent = module.get<InventoryAgent>(InventoryAgent);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkAndReserve', () => {
    const locationId = 'loc-001';
    const items: OrderItemDto[] = [
      {
        sku: 'WINE-001',
        quantity: 2,
        priceAtSale: 19.99,
      },
    ];

    it('should successfully reserve inventory with row locking', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 0,
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          quantity: 10,
          reserved: 0,
        },
      ];

      // Mock transaction execution
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          // Create transaction context with mocked methods
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({
                id: 'inv-001',
                reserved: 2,
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, items);

      expect(result).toHaveProperty('reservationId');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        sku: 'WINE-001',
        quantity: 2,
        productId: 'prod-001',
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        }),
      );
    });

    it('should throw error when product not found', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            $queryRaw: jest.fn(),
          };

          await callback(txContext as never);
        },
      );

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(BadRequestException);
      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(
        'Product with SKU WINE-001 not found',
      );
    });

    it('should throw error when insufficient inventory', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 9, // Only 1 available
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          quantity: 10,
          reserved: 9, // Only 1 available, but requesting 2
        },
      ];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(BadRequestException);
      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(
        'Insufficient inventory',
      );
    });

    it('should handle non-tracked inventory products', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: false, // Not tracked
        inventory: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            $queryRaw: jest.fn(),
          };

          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, items);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        sku: 'WINE-001',
        quantity: 2,
        productId: 'prod-001',
      });
    });

    it('should throw error when inventory record not found', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [], // No inventory record
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            $queryRaw: jest.fn(),
          };

          await callback(txContext as never);
        },
      );

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(BadRequestException);
      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow('No inventory found');
    });

    it('should throw error when row lock fails', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 0,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            $queryRaw: jest.fn().mockResolvedValue([]), // Empty result = lock failed
          };

          await callback(txContext as never);
        },
      );

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(BadRequestException);
      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(
        'Failed to lock inventory',
      );
    });

    it('should reserve multiple items atomically', async () => {
      const multipleItems: OrderItemDto[] = [
        { sku: 'WINE-001', quantity: 2, priceAtSale: 19.99 },
        { sku: 'BEER-001', quantity: 3, priceAtSale: 5.99 },
      ];

      const mockProducts = {
        'WINE-001': {
          id: 'prod-001',
          sku: 'WINE-001',
          name: 'Test Wine',
          trackInventory: true,
          inventory: [{ id: 'inv-001', quantity: 10, reserved: 0 }],
        },
        'BEER-001': {
          id: 'prod-002',
          sku: 'BEER-001',
          name: 'Test Beer',
          trackInventory: true,
          inventory: [{ id: 'inv-002', quantity: 20, reserved: 0 }],
        },
      };

      let callCount = 0;
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockImplementation(({ where }) => {
                const product = mockProducts[where.sku as keyof typeof mockProducts];
                return Promise.resolve(product);
              }),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({}),
            },
            $queryRaw: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([{ id: 'inv-001', quantity: 10, reserved: 0 }]);
              }
              return Promise.resolve([{ id: 'inv-002', quantity: 20, reserved: 0 }]);
            }),
          };

          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, multipleItems);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].sku).toBe('WINE-001');
      expect(result.items[1].sku).toBe('BEER-001');
    });
  });

  describe('release', () => {
    const locationId = 'loc-001';
    const reservation = {
      reservationId: 'res-001',
      items: [
        {
          sku: 'WINE-001',
          quantity: 2,
          productId: 'prod-001',
        },
      ],
    };

    it('should release reserved inventory with row locking', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            reserved: 5,
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          reserved: 5,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({
                id: 'inv-001',
                reserved: 3,
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      await agent.release(reservation, locationId);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('should not go below zero when releasing', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            reserved: 1, // Less than quantity being released
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          reserved: 1,
        },
      ];

      let capturedUpdate: { reserved: number } | null = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockImplementation(({ data }) => {
                capturedUpdate = data as { reserved: number };
                return Promise.resolve({
                  id: 'inv-001',
                  reserved: data.reserved,
                });
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      await agent.release(reservation, locationId);

      expect(capturedUpdate).not.toBeNull();
      expect(capturedUpdate?.reserved).toBe(0); // Should be 0, not negative
    });
  });

  describe('commit', () => {
    const locationId = 'loc-001';
    const reservation = {
      reservationId: 'res-001',
      items: [
        {
          sku: 'WINE-001',
          quantity: 2,
          productId: 'prod-001',
        },
      ],
    };

    it('should commit reservation with row locking', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 5,
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          quantity: 10,
          reserved: 5,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({
                id: 'inv-001',
                quantity: 8,
                reserved: 3,
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      await agent.commit(reservation, locationId);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('should update both quantity and reserved atomically', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 2,
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          quantity: 10,
          reserved: 2,
        },
      ];

      let capturedUpdate: { quantity: number; reserved: number } | null = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockImplementation(({ data }) => {
                capturedUpdate = data as { quantity: number; reserved: number };
                return Promise.resolve({
                  id: 'inv-001',
                  quantity: data.quantity,
                  reserved: data.reserved,
                });
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      await agent.commit(reservation, locationId);

      expect(capturedUpdate).not.toBeNull();
      expect(capturedUpdate?.quantity).toBe(8); // 10 - 2
      expect(capturedUpdate?.reserved).toBe(0); // 2 - 2
    });

    it('should handle non-tracked inventory products', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: false,
        inventory: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn(),
            },
            $queryRaw: jest.fn(),
          };

          await callback(txContext as never);
        },
      );

      await agent.commit(reservation, locationId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle missing inventory record gracefully', async () => {
      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: true,
        inventory: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn(),
            },
            $queryRaw: jest.fn(),
          };

          await callback(txContext as never);
        },
      );

      await expect(agent.commit(reservation, locationId)).resolves.not.toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    const locationId = 'loc-001';

    it('should handle empty items array for checkAndReserve', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: { findUnique: jest.fn() },
            inventory: { update: jest.fn() },
            $queryRaw: jest.fn(),
          };
          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, []);

      expect(result).toHaveProperty('reservationId');
      expect(result.items).toHaveLength(0);
    });

    it('should handle transaction timeout', async () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction timeout'));

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow('Transaction timeout');
    });

    it('should handle database connection errors', async () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      mockPrismaService.$transaction.mockRejectedValue(new Error('Database connection failed'));

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle very large quantity reservations', async () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 999999 }];

      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 1000000,
            reserved: 0,
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          quantity: 1000000,
          reserved: 0,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({
                id: 'inv-001',
                reserved: 999999,
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, items);

      expect(result.items[0].quantity).toBe(999999);
    });

    it('should handle zero quantity items', async () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 0 }];

      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 0,
          },
        ],
      };

      const mockLockedInventory = [
        {
          id: 'inv-001',
          quantity: 10,
          reserved: 0,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({
                id: 'inv-001',
                reserved: 0,
              }),
            },
            $queryRaw: jest.fn().mockResolvedValue(mockLockedInventory),
          };

          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, items);

      expect(result.items[0].quantity).toBe(0);
    });

    it('should handle concurrent reservation attempts (race condition simulation)', async () => {
      const items: OrderItemDto[] = [
        { sku: 'WINE-001', quantity: 6, priceAtSale: 19.99 }, // Request 6 items
      ];

      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        name: 'Test Wine',
        trackInventory: true,
        inventory: [
          {
            id: 'inv-001',
            quantity: 10,
            reserved: 0,
          },
        ],
      };

      // First call succeeds
      mockPrismaService.$transaction
        .mockImplementationOnce(
          async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
            const txContext = {
              product: {
                findUnique: jest.fn().mockResolvedValue(mockProduct),
              },
              inventory: {
                update: jest.fn().mockResolvedValue({
                  id: 'inv-001',
                  reserved: 6,
                }),
              },
              $queryRaw: jest
                .fn()
                .mockResolvedValue([{ id: 'inv-001', quantity: 10, reserved: 0 }]),
            };
            await callback(txContext as never);
          },
        )
        // Second call sees updated reserved amount (only 4 available now)
        .mockImplementationOnce(
          async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
            const txContext = {
              product: {
                findUnique: jest.fn().mockResolvedValue(mockProduct),
              },
              inventory: {
                update: jest.fn(),
              },
              $queryRaw: jest.fn().mockResolvedValue([
                { id: 'inv-001', quantity: 10, reserved: 6 }, // Already reserved 6, only 4 available
              ]),
            };
            await callback(txContext as never);
          },
        );

      const result1 = await agent.checkAndReserve(locationId, items);
      expect(result1.items[0].quantity).toBe(6);

      // Second attempt should fail - only 4 available but requesting 6
      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(BadRequestException);
    });

    it('should handle release with empty reservation', async () => {
      const emptyReservation = {
        reservationId: 'res-001',
        items: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: { findUnique: jest.fn() },
            inventory: { update: jest.fn() },
            $queryRaw: jest.fn(),
          };
          await callback(txContext as never);
        },
      );

      await expect(agent.release(emptyReservation, locationId)).resolves.not.toThrow();
    });

    it('should handle commit with empty reservation', async () => {
      const emptyReservation = {
        reservationId: 'res-001',
        items: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: { findUnique: jest.fn() },
            inventory: { update: jest.fn() },
            $queryRaw: jest.fn(),
          };
          await callback(txContext as never);
        },
      );

      await expect(agent.commit(emptyReservation, locationId)).resolves.not.toThrow();
    });

    it('should handle product lookup failure during release', async () => {
      const reservation = {
        reservationId: 'res-001',
        items: [
          {
            sku: 'WINE-001',
            quantity: 2,
            productId: 'prod-001',
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            inventory: {
              update: jest.fn(),
            },
            $queryRaw: jest.fn(),
          };
          await callback(txContext as never);
        },
      );

      await expect(agent.release(reservation, locationId)).resolves.not.toThrow();
    });

    it('should handle multiple items with mixed tracking status', async () => {
      const multipleItems: OrderItemDto[] = [
        { sku: 'WINE-001', quantity: 2 },
        { sku: 'SERVICE-001', quantity: 1 },
        { sku: 'BEER-001', quantity: 3 },
      ];

      const mockProducts = {
        'WINE-001': {
          id: 'prod-001',
          sku: 'WINE-001',
          name: 'Test Wine',
          trackInventory: true,
          inventory: [{ id: 'inv-001', quantity: 10, reserved: 0 }],
        },
        'SERVICE-001': {
          id: 'prod-002',
          sku: 'SERVICE-001',
          name: 'Service Item',
          trackInventory: false,
          inventory: [],
        },
        'BEER-001': {
          id: 'prod-003',
          sku: 'BEER-001',
          name: 'Test Beer',
          trackInventory: true,
          inventory: [{ id: 'inv-003', quantity: 20, reserved: 0 }],
        },
      };

      let callCount = 0;
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockImplementation(({ where }) => {
                const product = mockProducts[where.sku as keyof typeof mockProducts];
                return Promise.resolve(product);
              }),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({}),
            },
            $queryRaw: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([{ id: 'inv-001', quantity: 10, reserved: 0 }]);
              }
              return Promise.resolve([{ id: 'inv-003', quantity: 20, reserved: 0 }]);
            }),
          };

          await callback(txContext as never);
        },
      );

      const result = await agent.checkAndReserve(locationId, multipleItems);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].sku).toBe('WINE-001');
      expect(result.items[1].sku).toBe('SERVICE-001');
      expect(result.items[2].sku).toBe('BEER-001');
    });

    it('should handle lock acquisition failure gracefully', async () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      mockPrismaService.$transaction.mockRejectedValue(new Error('Could not acquire lock'));

      await expect(agent.checkAndReserve(locationId, items)).rejects.toThrow(
        'Could not acquire lock',
      );
    });
  });

  describe('Transaction isolation and consistency', () => {
    const locationId = 'loc-001';

    it('should use Serializable isolation level for checkAndReserve', async () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      const mockProduct = {
        id: 'prod-001',
        sku: 'WINE-001',
        trackInventory: true,
        inventory: [{ id: 'inv-001', quantity: 10, reserved: 0 }],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: {
              findUnique: jest.fn().mockResolvedValue(mockProduct),
            },
            inventory: {
              update: jest.fn().mockResolvedValue({}),
            },
            $queryRaw: jest.fn().mockResolvedValue([{ id: 'inv-001', quantity: 10, reserved: 0 }]),
          };
          await callback(txContext as never);
        },
      );

      await agent.checkAndReserve(locationId, items);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        }),
      );
    });

    it('should use Serializable isolation level for release', async () => {
      const reservation = {
        reservationId: 'res-001',
        items: [{ sku: 'WINE-001', quantity: 2, productId: 'prod-001' }],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: { findUnique: jest.fn().mockResolvedValue(null) },
            inventory: { update: jest.fn() },
            $queryRaw: jest.fn(),
          };
          await callback(txContext as never);
        },
      );

      await agent.release(reservation, locationId);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('should use Serializable isolation level for commit', async () => {
      const reservation = {
        reservationId: 'res-001',
        items: [{ sku: 'WINE-001', quantity: 2, productId: 'prod-001' }],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaService) => Promise<void>) => {
          const txContext = {
            product: { findUnique: jest.fn().mockResolvedValue(null) },
            inventory: { update: jest.fn() },
            $queryRaw: jest.fn(),
          };
          await callback(txContext as never);
        },
      );

      await agent.commit(reservation, locationId);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });
  });
});
