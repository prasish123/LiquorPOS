import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new location
     */
    async create(dto: CreateLocationDto) {
        const location = await this.prisma.location.create({
            data: {
                ...dto,
                licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
            },
        });

        return location;
    }

    /**
     * Find all locations
     */
    async findAll() {
        const locations = await this.prisma.location.findMany({
            include: {
                inventory: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                    },
                },
                _count: {
                    select: {
                        transactions: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        return locations;
    }

    /**
     * Find location by ID
     */
    async findOne(id: string) {
        const location = await this.prisma.location.findUnique({
            where: { id },
            include: {
                inventory: {
                    include: {
                        product: true,
                    },
                },
                _count: {
                    select: {
                        transactions: true,
                    },
                },
            },
        });

        if (!location) {
            throw new NotFoundException(`Location with ID ${id} not found`);
        }

        return location;
    }

    /**
     * Update location
     */
    async update(id: string, dto: UpdateLocationDto) {
        await this.findOne(id); // Check if exists

        const updated = await this.prisma.location.update({
            where: { id },
            data: {
                ...dto,
                licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
            },
        });

        return updated;
    }

    /**
     * Delete location
     */
    async remove(id: string) {
        await this.findOne(id); // Check if exists

        // Check if location has transactions
        const transactionCount = await this.prisma.transaction.count({
            where: { locationId: id },
        });

        if (transactionCount > 0) {
            throw new Error('Cannot delete location with existing transactions');
        }

        await this.prisma.location.delete({
            where: { id },
        });

        return { message: 'Location deleted successfully' };
    }

    /**
     * Get locations with expiring licenses (within 30 days)
     */
    async getExpiringLicenses() {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const locations = await this.prisma.location.findMany({
            where: {
                licenseExpiry: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                },
            },
            orderBy: {
                licenseExpiry: 'asc',
            },
        });

        return locations;
    }

    /**
     * Get locations with expired licenses
     */
    async getExpiredLicenses() {
        const locations = await this.prisma.location.findMany({
            where: {
                licenseExpiry: {
                    lt: new Date(),
                },
            },
            orderBy: {
                licenseExpiry: 'desc',
            },
        });

        return locations;
    }
}
