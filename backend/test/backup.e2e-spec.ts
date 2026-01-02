import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Backup System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let backupId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create admin user and get token
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-backup-test',
        password: '$2b$10$test', // Hashed password
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
      },
    });

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin-backup-test',
        password: 'test123',
      });

    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { username: 'admin-backup-test' },
    });

    // Cleanup test backups
    if (backupId) {
      try {
        const backupPath = path.join('./backups', `${backupId}.sql.gz`);
        await fs.unlink(backupPath);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    await app.close();
  });

  describe('POST /api/backup/create', () => {
    it('should create a backup successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('backupId');
      expect(response.body).toHaveProperty('message');

      backupId = response.body.backupId;

      // Verify backup file exists
      const backupPath = path.join('./backups', `${backupId}.sql.gz`);
      const fileExists = await fs
        .access(backupPath)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    }, 60000); // 60 second timeout for backup creation

    it('should reject backup creation without admin token', async () => {
      await request(app.getHttpServer())
        .post('/api/backup/create')
        .expect(401);
    });

    it('should reject backup creation with non-admin token', async () => {
      // Create regular user
      const regularUser = await prisma.user.create({
        data: {
          username: 'regular-user-test',
          password: '$2b$10$test',
          firstName: 'Regular',
          lastName: 'User',
          role: 'CASHIER',
        },
      });

      // Login as regular user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'regular-user-test',
          password: 'test123',
        });

      const regularToken = loginResponse.body.access_token;

      await request(app.getHttpServer())
        .post('/api/backup/create')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      // Cleanup
      await prisma.user.delete({ where: { id: regularUser.id } });
    });
  });

  describe('GET /api/backup/list', () => {
    it('should list all backups', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/backup/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('backups');
      expect(Array.isArray(response.body.backups)).toBe(true);

      if (backupId) {
        const backup = response.body.backups.find((b: any) => b.id === backupId);
        expect(backup).toBeDefined();
        expect(backup).toHaveProperty('timestamp');
        expect(backup).toHaveProperty('type', 'full');
        expect(backup).toHaveProperty('status', 'completed');
      }
    });

    it('should reject list request without admin token', async () => {
      await request(app.getHttpServer())
        .get('/api/backup/list')
        .expect(401);
    });
  });

  describe('GET /api/backup/stats', () => {
    it('should return backup statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/backup/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalBackups');
      expect(response.body.stats).toHaveProperty('lastBackupTime');
      expect(response.body.stats).toHaveProperty('lastBackupStatus');
      expect(response.body.stats).toHaveProperty('totalSize');
      expect(response.body.stats).toHaveProperty('failedBackupsLast24h');

      expect(typeof response.body.stats.totalBackups).toBe('number');
      expect(response.body.stats.totalBackups).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/backup/verify', () => {
    it('should verify backup integrity', async () => {
      if (!backupId) {
        // Create a backup first
        const createResponse = await request(app.getHttpServer())
          .post('/api/backup/create')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);

        backupId = createResponse.body.backupId;
      }

      const response = await request(app.getHttpServer())
        .post('/api/backup/verify')
        .query({ backupId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Backup integrity verified');
    }, 30000);

    it('should reject verification of non-existent backup', async () => {
      await request(app.getHttpServer())
        .post('/api/backup/verify')
        .query({ backupId: 'backup-nonexistent' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /health/backup', () => {
    it('should return backup health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/backup')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('backup');

      const backupHealth = response.body.info.backup;
      expect(backupHealth).toHaveProperty('status');
      expect(backupHealth).toHaveProperty('totalBackups');
      expect(backupHealth).toHaveProperty('lastBackupTime');
      expect(backupHealth).toHaveProperty('lastBackupStatus');
    });

    it('should not require authentication for health check', async () => {
      await request(app.getHttpServer())
        .get('/health/backup')
        .expect(200);
    });
  });

  describe('Backup Metadata', () => {
    it('should store backup metadata correctly', async () => {
      const metadataPath = path.join('./backups', 'metadata.json');

      const data = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(data);

      expect(Array.isArray(metadata)).toBe(true);

      if (backupId) {
        const backup = metadata.find((m: any) => m.id === backupId);
        expect(backup).toBeDefined();
        expect(backup).toHaveProperty('id', backupId);
        expect(backup).toHaveProperty('timestamp');
        expect(backup).toHaveProperty('type', 'full');
        expect(backup).toHaveProperty('size');
        expect(backup).toHaveProperty('checksum');
        expect(backup).toHaveProperty('status', 'completed');
        expect(backup).toHaveProperty('location');
        expect(backup).toHaveProperty('retentionUntil');

        // Verify checksum is SHA-256 (64 hex characters)
        expect(backup.checksum).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });

  describe('Backup File Integrity', () => {
    it('should create compressed backup file', async () => {
      if (!backupId) {
        const createResponse = await request(app.getHttpServer())
          .post('/api/backup/create')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);

        backupId = createResponse.body.backupId;
      }

      const backupPath = path.join('./backups', `${backupId}.sql.gz`);
      const stats = await fs.stat(backupPath);

      // Verify file exists and has content
      expect(stats.size).toBeGreaterThan(0);

      // Verify file is compressed (gzip magic number)
      const buffer = Buffer.alloc(2);
      const fd = await fs.open(backupPath, 'r');
      await fd.read(buffer, 0, 2, 0);
      await fd.close();

      // Gzip magic number: 0x1f 0x8b
      expect(buffer[0]).toBe(0x1f);
      expect(buffer[1]).toBe(0x8b);
    }, 60000);
  });

  describe('Backup Retention', () => {
    it('should set correct retention date', async () => {
      const metadataPath = path.join('./backups', 'metadata.json');
      const data = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(data);

      if (backupId) {
        const backup = metadata.find((m: any) => m.id === backupId);
        expect(backup).toBeDefined();

        const retentionDate = new Date(backup.retentionUntil);
        const createdDate = new Date(backup.timestamp);
        const daysDiff = Math.floor(
          (retentionDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Should be 30 days retention
        expect(daysDiff).toBeGreaterThanOrEqual(29);
        expect(daysDiff).toBeLessThanOrEqual(31);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid backup ID gracefully', async () => {
      await request(app.getHttpServer())
        .post('/api/backup/verify')
        .query({ backupId: 'invalid-id' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle missing authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/backup/create')
        .expect(401);
    });

    it('should handle malformed JWT token', async () => {
      await request(app.getHttpServer())
        .post('/api/backup/create')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

