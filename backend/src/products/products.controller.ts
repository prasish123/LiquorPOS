import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  SearchProductDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('products')
@ApiBearerAuth('JWT')
@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Create a new product
   * POST /api/products
   */
  @Post()
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Add a new product to the catalog with pricing, inventory settings, and compliance information.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
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
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  /**
   * Get all products with pagination
   * GET /api/products?page=1&limit=50
   */
  @Get()
  @ApiOperation({
    summary: 'List all products',
    description: 'Retrieve a paginated list of all products in the catalog.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50)',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
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
  @ApiOperation({
    summary: 'Search products',
    description:
      'Search products by name, SKU, or description with optional category filter.',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Search query string',
    example: 'cabernet',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category',
    example: 'wine',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  search(@Query() searchDto: SearchProductDto) {
    return this.productsService.search(searchDto);
  }

  /**
   * AI-powered semantic search
   * GET /api/products/ai-search?query=red wine under $30&limit=20
   */
  @Get('ai-search')
  @ApiOperation({
    summary: 'AI-powered semantic search',
    description:
      'Search products using natural language queries powered by AI embeddings.',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Natural language search query',
    example: 'red wine under $30',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'AI search results retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  aiSearch(@Query('query') query: string, @Query('limit') limit?: string) {
    return this.productsService.searchWithAI(
      query,
      limit ? parseInt(limit) : 20,
    );
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock?locationId=xxx
   */
  @Get('low-stock')
  @ApiOperation({
    summary: 'Get low stock products',
    description: 'Retrieve products with inventory below reorder point.',
  })
  @ApiQuery({
    name: 'locationId',
    required: false,
    type: String,
    description: 'Filter by location ID',
    example: 'loc-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock products retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getLowStock(@Query('locationId') locationId?: string) {
    return this.productsService.getLowStock(locationId);
  }

  /**
   * Get products by category
   * GET /api/products/category/:category
   */
  @Get('category/:category')
  @ApiOperation({
    summary: 'Get products by category',
    description:
      'Retrieve all products in a specific category (wine, beer, spirits, mixers, snacks).',
  })
  @ApiParam({
    name: 'category',
    type: String,
    description: 'Product category',
    example: 'wine',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 50)',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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
  @ApiOperation({
    summary: 'Get product by SKU',
    description: 'Retrieve a specific product by its SKU code.',
  })
  @ApiParam({
    name: 'sku',
    type: String,
    description: 'Product SKU code',
    example: 'WINE-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  /**
   * Get product by ID (must be last - catches all other routes)
   * GET /api/products/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve a specific product by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * Update product
   * PUT /api/products/:id
   */
  @Put(':id')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Update product',
    description:
      'Update product information including pricing, inventory settings, and compliance details.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  @Delete(':id')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Delete product',
    description:
      'Remove a product from the catalog. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
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
    return this.productsService.remove(id);
  }
}
