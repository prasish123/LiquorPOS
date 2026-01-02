import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService, RestoreOptions } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('backup')
@Controller('api/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create manual backup' })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createBackup() {
    const backupId = await this.backupService.createFullBackup();
    return {
      success: true,
      backupId,
      message: 'Backup created successfully',
    };
  }

  @Post('restore')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore from backup' })
  @ApiResponse({ status: 200, description: 'Restore completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async restoreBackup(@Body() options: RestoreOptions) {
    await this.backupService.restoreFromBackup(options);
    return {
      success: true,
      message: 'Restore completed successfully',
    };
  }

  @Post('verify')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify backup integrity' })
  @ApiResponse({ status: 200, description: 'Backup verified successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async verifyBackup(@Query('backupId') backupId: string) {
    await this.backupService.restoreFromBackup({
      backupId,
      validateOnly: true,
    });
    return {
      success: true,
      message: 'Backup integrity verified',
    };
  }

  @Get('list')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all backups' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return {
      success: true,
      backups,
    };
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get backup statistics' })
  @ApiResponse({ status: 200, description: 'Backup statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStats() {
    const stats = await this.backupService.getBackupStats();
    return {
      success: true,
      stats,
    };
  }
}

