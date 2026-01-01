import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor() {
    // Create Prisma adapter with database URL
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL || 'file:./dev.db',
    });

    // Initialize Prisma with adapter
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.prisma.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    console.log('👋 Database disconnected');
  }

  // Delegate all Prisma client properties
  get product() {
    return this.prisma.product;
  }

  get productImage() {
    return this.prisma.productImage;
  }

  get inventory() {
    return this.prisma.inventory;
  }

  get location() {
    return this.prisma.location;
  }

  get transaction() {
    return this.prisma.transaction;
  }

  get transactionItem() {
    return this.prisma.transactionItem;
  }

  get payment() {
    return this.prisma.payment;
  }

  get customer() {
    return this.prisma.customer;
  }

  get eventLog() {
    return this.prisma.eventLog;
  }

  get auditLog() {
    return this.prisma.auditLog;
  }

  get user() {
    return this.prisma.user;
  }
}
