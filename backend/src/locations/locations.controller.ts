import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Controller('api/locations')
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    /**
     * Create a new location
     * POST /api/locations
     */
    @Post()
    create(@Body() createLocationDto: CreateLocationDto) {
        return this.locationsService.create(createLocationDto);
    }

    /**
     * Get all locations
     * GET /api/locations
     */
    @Get()
    findAll() {
        return this.locationsService.findAll();
    }

    /**
     * Get locations with expiring licenses
     * GET /api/locations/expiring-licenses
     */
    @Get('expiring-licenses')
    getExpiringLicenses() {
        return this.locationsService.getExpiringLicenses();
    }

    /**
     * Get locations with expired licenses
     * GET /api/locations/expired-licenses
     */
    @Get('expired-licenses')
    getExpiredLicenses() {
        return this.locationsService.getExpiredLicenses();
    }

    /**
     * Get location by ID
     * GET /api/locations/:id
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.locationsService.findOne(id);
    }

    /**
     * Update location
     * PUT /api/locations/:id
     */
    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() updateLocationDto: UpdateLocationDto,
    ) {
        return this.locationsService.update(id, updateLocationDto);
    }

    /**
     * Delete location
     * DELETE /api/locations/:id
     */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.locationsService.remove(id);
    }
}
