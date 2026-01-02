import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../../src/orders/orders.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { CustomersService } from '../../src/customers/customers.service';
import { PrismaService } from '../../src/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Order Integration Tests', () => {
  let ordersService: OrdersService;
  let inventoryService: InventoryService;
  let customersService: CustomersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        InventoryService,
        CustomersService,
        PrismaService,
        EventEmitter2,
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    inventoryService = module.get<InventoryService>(InventoryService);
    customersService = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Order → Inventory Flow', () => {
    it('should reserve inventory when order is created', async () => {
      // Create test data
      const product = await prisma.product.create({
        data: {
          sku: 'TEST-001',
          name: 'Test Product',
          category: 'test',
          basePrice: 10.0,
          cost: 5.0,
        },
      });

      const location = await prisma.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
        },
      });

      const inventory = await inventoryService.create({
        productId: product.id,
        locationId: location.id,
        quantity: 100,
        reserved: 0,
      });

      // Create order (this should reserve inventory)
      const order = await ordersService.create({
        locationId: location.id,
        terminalId: 'test-terminal',
        items: [
          {
            sku: 'TEST-001',
            quantity: 5,
            discount: 0,
          },
        ],
        paymentMethod: 'cash',
        channel: 'counter',
      });

      // Verify inventory was reserved
      const updatedInventory = await inventoryService.findOne(inventory.id);
      expect(updatedInventory.reserved).toBe(5);
      expect(updatedInventory.quantity).toBe(100); // Not yet committed

      // Cleanup
      await prisma.transaction.deleteMany({ where: { id: order.id } });
      await prisma.inventory.delete({ where: { id: inventory.id } });
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.location.delete({ where: { id: location.id } });
    });

    it('should rollback inventory on order failure', async () => {
      // This test would simulate an order failure scenario
      // and verify that inventory reservation is released
    });
  });

  describe('Loyalty Points → Lifetime Value', () => {
    it('should update customer lifetime value after order', async () => {
      // Create customer
      const customer = await customersService.create({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
      });

      const initialLifetimeValue = customer.lifetimeValue;

      // Simulate order completion
      await customersService.updateLifetimeValue(customer.id, 50.0);

      // Verify lifetime value updated
      const updatedCustomer = await customersService.findOne(customer.id);
      expect(updatedCustomer.lifetimeValue).toBe(initialLifetimeValue + 50.0);

      // Cleanup
      await prisma.customer.delete({ where: { id: customer.id } });
    });

    it('should award loyalty points on purchase', async () => {
      const customer = await customersService.create({
        firstName: 'Loyalty',
        lastName: 'Test',
        email: 'loyalty@example.com',
      });

      // Award points
      await customersService.updateLoyaltyPoints(customer.id, {
        points: 100,
        reason: 'purchase',
      });

      // Verify points awarded
      const updatedCustomer = await customersService.findOne(customer.id);
      expect(updatedCustomer.loyaltyPoints).toBe(100);

      // Cleanup
      await prisma.customer.delete({ where: { id: customer.id } });
    });
  });

  describe('Low Stock → Reorder Alerts', () => {
    it('should detect low stock items', async () => {
      const product = await prisma.product.create({
        data: {
          sku: 'LOW-STOCK-001',
          name: 'Low Stock Product',
          category: 'test',
          basePrice: 10.0,
          cost: 5.0,
        },
      });

      const location = await prisma.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
        },
      });

      // Create inventory with low stock
      await inventoryService.create({
        productId: product.id,
        locationId: location.id,
        quantity: 5,
        reserved: 0,
        reorderPoint: 10,
      });

      // Get low stock items
      const lowStockItems = await inventoryService.getLowStock();

      // Verify item is in low stock list
      expect(lowStockItems.length).toBeGreaterThan(0);
      expect(lowStockItems.some((item) => item.productId === product.id)).toBe(
        true,
      );

      // Cleanup
      await prisma.inventory.deleteMany({ where: { productId: product.id } });
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.location.delete({ where: { id: location.id } });
    });
  });
});
