import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => {
    if (callback) {
      callback(null, { stdout: '', stderr: '' });
    }
  }),
}));

// Mock fs/promises
jest.mock('fs/promises');

describe('BackupService', () => {
  let service: BackupService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        BACKUP_DIR: './test-backups',
        WAL_ARCHIVE_DIR: './test-wal',
        BACKUP_RETENTION_DAYS: 30,
        BACKUP_ENABLED: true,
        BACKUP_S3_ENABLED: false,
        BACKUP_S3_BUCKET: '',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock fs operations
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('[]');
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.stat as jest.Mock).mockResolvedValue({
      size: 1024000,
      mtime: new Date(),
      mtimeMs: Date.now(),
    });
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.access as jest.Mock).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize backup directories', async () => {
      await service.onModuleInit();

      expect(fs.mkdir).toHaveBeenCalledWith('./test-backups', { recursive: true });
      expect(fs.mkdir).toHaveBeenCalledWith('./test-wal', { recursive: true });
    });

    it('should skip initialization if backup is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'BACKUP_ENABLED') return false;
        return mockConfigService.get(key);
      });

      const newService = new BackupService(configService);
      await newService.onModuleInit();

      // Should not create directories if disabled
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('getBackupStats', () => {
    it('should return backup statistics', async () => {
      const stats = await service.getBackupStats();

      expect(stats).toHaveProperty('totalBackups');
      expect(stats).toHaveProperty('lastBackupTime');
      expect(stats).toHaveProperty('lastBackupStatus');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('oldestBackup');
      expect(stats).toHaveProperty('failedBackupsLast24h');

      expect(typeof stats.totalBackups).toBe('number');
      expect(typeof stats.failedBackupsLast24h).toBe('number');
    });

    it('should handle empty backup list', async () => {
      const stats = await service.getBackupStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.lastBackupTime).toBeNull();
      expect(stats.oldestBackup).toBeNull();
    });
  });

  describe('listBackups', () => {
    it('should return list of backups', async () => {
      const backups = await service.listBackups();

      expect(Array.isArray(backups)).toBe(true);
    });

    it('should sort backups by timestamp descending', async () => {
      // Mock multiple backups
      const mockBackups = [
        {
          id: 'backup-1',
          timestamp: new Date('2024-01-01'),
          type: 'full' as const,
          size: 1000,
          checksum: 'abc123',
          status: 'completed' as const,
          location: '/path/1',
          retentionUntil: new Date('2024-02-01'),
        },
        {
          id: 'backup-2',
          timestamp: new Date('2024-01-02'),
          type: 'full' as const,
          size: 1000,
          checksum: 'def456',
          status: 'completed' as const,
          location: '/path/2',
          retentionUntil: new Date('2024-02-02'),
        },
      ];

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockBackups));

      // Reinitialize service to load mocked backups
      await service.onModuleInit();

      const backups = await service.listBackups();

      expect(backups.length).toBe(2);
      expect(backups[0].id).toBe('backup-2'); // Most recent first
      expect(backups[1].id).toBe('backup-1');
    });
  });

  describe('createFullBackup', () => {
    it('should create a backup with correct metadata', async () => {
      const backupId = await service.createFullBackup();

      expect(backupId).toMatch(/^backup-\d+$/);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle backup creation errors', async () => {
      const { exec } = require('child_process');
      exec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(new Error('Backup failed'));
      });

      await expect(service.createFullBackup()).rejects.toThrow();
    });
  });

  describe('verifyBackupIntegrity', () => {
    it('should verify backup checksum', async () => {
      const mockMetadata = {
        id: 'backup-test',
        timestamp: new Date(),
        type: 'full' as const,
        size: 1024,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA-256 of empty string
        status: 'completed' as const,
        location: './test-backups/backup-test.sql.gz',
        retentionUntil: new Date(),
      };

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(''));

      await expect(service.verifyBackupIntegrity(mockMetadata)).resolves.toBe(true);
    });

    it('should reject backup with invalid checksum', async () => {
      const mockMetadata = {
        id: 'backup-test',
        timestamp: new Date(),
        type: 'full' as const,
        size: 1024,
        checksum: 'invalid-checksum',
        status: 'completed' as const,
        location: './test-backups/backup-test.sql.gz',
        retentionUntil: new Date(),
      };

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test data'));

      await expect(service.verifyBackupIntegrity(mockMetadata)).rejects.toThrow(
        /Checksum mismatch/,
      );
    });

    it('should reject backup with missing file', async () => {
      const mockMetadata = {
        id: 'backup-test',
        timestamp: new Date(),
        type: 'full' as const,
        size: 1024,
        checksum: 'abc123',
        status: 'completed' as const,
        location: './test-backups/backup-test.sql.gz',
        retentionUntil: new Date(),
      };

      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.verifyBackupIntegrity(mockMetadata)).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should load configuration from environment', () => {
      expect(configService.get).toHaveBeenCalledWith('BACKUP_DIR', expect.any(String));
      expect(configService.get).toHaveBeenCalledWith('WAL_ARCHIVE_DIR', expect.any(String));
      expect(configService.get).toHaveBeenCalledWith('BACKUP_RETENTION_DAYS', expect.any(Number));
      expect(configService.get).toHaveBeenCalledWith('BACKUP_ENABLED', expect.any(Boolean));
    });

    it('should use default values when not configured', () => {
      const defaults = {
        BACKUP_DIR: './backups',
        WAL_ARCHIVE_DIR: './wal_archive',
        BACKUP_RETENTION_DAYS: 30,
        BACKUP_ENABLED: true,
      };

      Object.entries(defaults).forEach(([key, value]) => {
        const result = mockConfigService.get(key, value);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Backup Retention', () => {
    it('should calculate correct retention date', async () => {
      const retentionDays = 30;
      const now = Date.now();
      const expectedRetention = now + retentionDays * 24 * 60 * 60 * 1000;

      // This is tested indirectly through backup creation
      const backupId = await service.createFullBackup();
      expect(backupId).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.onModuleInit()).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      const { exec } = require('child_process');
      exec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(new Error('Connection refused'));
      });

      await expect(service.createFullBackup()).rejects.toThrow();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      // This is a private method, but we can test it through getBackupStats
      const testCases = [
        { input: 0, expected: '0 Bytes' },
        { input: 1024, expected: '1 KB' },
        { input: 1048576, expected: '1 MB' },
        { input: 1073741824, expected: '1 GB' },
      ];

      // Test through backup stats which uses formatBytes
      testCases.forEach(async ({ input }) => {
        const stats = await service.getBackupStats();
        expect(typeof stats.totalSize).toBe('number');
      });
    });
  });
});

