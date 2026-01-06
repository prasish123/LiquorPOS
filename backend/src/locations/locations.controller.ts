import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('locations')
@ApiBearerAuth('JWT')
@Controller('api/locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Create a new location
   * POST /api/locations
   */
  @Post()
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Create a new location',
    description:
      'Register a new store location with address, license information, and operating hours.',
  })
  @ApiBody({ type: CreateLocationDto })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  /**
   * Get all locations
   * GET /api/locations
   */
  @Get()
  @ApiOperation({
    summary: 'List all locations',
    description: 'Retrieve a list of all store locations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Locations retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll() {
    return this.locationsService.findAll();
  }

  /**
   * Get locations with expiring licenses
   * GET /api/locations/expiring-licenses
   */
  @Get('expiring-licenses')
  @ApiOperation({
    summary: 'Get locations with expiring licenses',
    description: 'Retrieve locations with liquor licenses expiring within 90 days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expiring licenses retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getExpiringLicenses() {
    return this.locationsService.getExpiringLicenses();
  }

  /**
   * Get locations with expired licenses
   * GET /api/locations/expired-licenses
   */
  @Get('expired-licenses')
  @ApiOperation({
    summary: 'Get locations with expired licenses',
    description: 'Retrieve locations with expired liquor licenses.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expired licenses retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getExpiredLicenses() {
    return this.locationsService.getExpiredLicenses();
  }

  /**
   * Get location by ID
   * GET /api/locations/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get location by ID',
    description: 'Retrieve detailed information about a specific location.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Location ID',
    example: 'loc-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  /**
   * Update location
   * PUT /api/locations/:id
   */
  @Put(':id')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Update location',
    description: 'Update location information including address, license, and operating hours.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Location ID',
    example: 'loc-001',
  })
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  update(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationsService.update(id, updateLocationDto);
  }

  /**
   * Delete location
   * DELETE /api/locations/:id
   */
  @Delete(':id')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Delete location',
    description: 'Remove a location from the system. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Location ID',
    example: 'loc-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
