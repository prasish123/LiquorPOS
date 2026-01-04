import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PriceOverrideService,
  PriceOverrideRequest,
} from './price-override.service';
import { Request } from 'express';

@ApiTags('price-overrides')
@Controller('price-overrides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PriceOverrideController {
  constructor(private priceOverrideService: PriceOverrideService) {}

  @Post()
  @ApiOperation({ summary: 'Request price override with manager PIN' })
  async requestOverride(
    @Body() request: PriceOverrideRequest,
    @Req() req: Request,
  ) {
    const result = await this.priceOverrideService.requestOverride(request);
    return result;
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Get all overrides for a transaction' })
  async getTransactionOverrides(@Param('transactionId') transactionId: string) {
    return await this.priceOverrideService.getTransactionOverrides(
      transactionId,
    );
  }

  @Get('manager/:managerId/stats')
  @ApiOperation({ summary: 'Get manager override statistics' })
  async getManagerStats(
    @Param('managerId') managerId: string,
    @Param('days') days?: number,
  ) {
    return await this.priceOverrideService.getManagerOverrideStats(
      managerId,
      days,
    );
  }
}

