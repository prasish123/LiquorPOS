import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, SearchProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    /**
     * Create a new product
     * POST /api/products
     */
    @Post()
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    /**
     * Get all products with pagination
     * GET /api/products?page=1&limit=50
     */
    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.productsService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 50,
        );
    }

    /**
     * Search products
     * GET /api/products/search?q=wine&category=wine&limit=20
     */
    @Get('search')
    search(@Query() searchDto: SearchProductDto) {
        return this.productsService.search(searchDto);
    }

    /**
     * AI-powered semantic search
     * GET /api/products/ai-search?query=red wine under $30&limit=20
     */
    @Get('ai-search')
    aiSearch(@Query('query') query: string, @Query('limit') limit?: string) {
        return this.productsService.searchWithAI(query, limit ? parseInt(limit) : 20);
    }


    /**
     * Get low stock products
     * GET /api/products/low-stock?locationId=xxx
     */
    @Get('low-stock')
    getLowStock(@Query('locationId') locationId?: string) {
        return this.productsService.getLowStock(locationId);
    }

    /**
     * Get products by category
     * GET /api/products/category/:category
     */
    @Get('category/:category')
    findByCategory(
        @Param('category') category: string,
        @Query('limit') limit?: string,
    ) {
        return this.productsService.findByCategory(
            category,
            limit ? parseInt(limit) : 50,
        );
    }

    /**
     * Get product by SKU
     * GET /api/products/sku/:sku
     */
    @Get('sku/:sku')
    findBySku(@Param('sku') sku: string) {
        return this.productsService.findBySku(sku);
    }

    /**
     * Get product by ID (must be last - catches all other routes)
     * GET /api/products/:id
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    /**
     * Update product
     * PUT /api/products/:id
     */
    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        return this.productsService.update(id, updateProductDto);
    }

    /**
     * Delete product
     * DELETE /api/products/:id
     */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}
