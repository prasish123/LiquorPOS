import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { LocalAIService } from '../ai/local-ai.service';
import { LoggerService } from '../common/logger.service';
import { CreateProductDto, UpdateProductDto, SearchProductDto } from './dto/product.dto';
import { NotFoundException as AppNotFoundException, ErrorCode } from '../common/errors';

export interface ProductWithScore {
  id: string;
  name: string;
  category: string;
  embedding?: string | null;
  similarity?: number;
  finalScore?: number;
  sku?: string;
  basePrice?: number;
  description?: string | null;
  abv?: number | null;
  volumeMl?: number | null;
  [key: string]: any; // Allow additional properties
}

@Injectable()
export class ProductsService {
  private readonly logger = new LoggerService('ProductsService');

  constructor(
    private prisma: PrismaService,
    private aiService: LocalAIService,
    private redis: RedisService,
  ) {}

  /**
   * Create a new product
   */
  async create(dto: CreateProductDto) {
    // Invalidate Product Cache
    await this.redis.clearPattern('products:*');

    // Generate search text for vector embeddings
    const searchText = `${dto.name} ${dto.description || ''} ${dto.category}`.toLowerCase();
    // ... rest of create logic

    // Generate embedding locally
    let embedding: string | null = null;
    try {
      const embeddingVector = await this.aiService.generateEmbedding(searchText);
      embedding = JSON.stringify(embeddingVector);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to generate local embedding', {
        error: errorMessage,
      });
    }

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        searchText,
        embedding, // Store the vector!
        trackInventory: dto.trackInventory ?? true,
        ageRestricted: dto.ageRestricted ?? false,
      },
    });

    return product;
  }

  /**
   * Find all products with pagination
   */
  async findAll(page: number = 1, limit: number = 50) {
    const cacheKey = `products:all:${page}:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        include: {
          images: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.product.count(),
    ]);

    const result = {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 1 hour
    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  /**
   * Find product by ID
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppNotFoundException(ErrorCode.PRODUCT_NOT_FOUND, 'Product', id);
    }

    return product;
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        images: true,
        inventory: true,
      },
    });

    if (!product) {
      throw new AppNotFoundException(ErrorCode.PRODUCT_NOT_FOUND, 'Product', sku);
    }

    return product;
  }

  /**
   * Search products (basic text search for now, will add vector search later)
   */
  async search(dto: SearchProductDto) {
    const { query, category, limit = 20 } = dto;

    const where: any = {
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { sku: { contains: query } },
        { upc: { contains: query } },
      ],
    };

    if (category) {
      where.category = category;
    }

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      include: {
        images: true,
      },
    });

    return products;
  }

  /**
   * Update product
   */
  async update(id: string, dto: UpdateProductDto) {
    // Check if product exists and get current values
    const existingProduct = await this.findOne(id);

    // Update search text if name/description changed
    let searchText: string | undefined;
    if (dto.name || dto.description || dto.category) {
      searchText =
        `${dto.name || existingProduct.name} ${dto.description || existingProduct.description || ''} ${dto.category || existingProduct.category}`.toLowerCase();
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        ...(searchText && { searchText }),
      },
      include: {
        images: true,
      },
    });

    // Clear cache
    await this.redis.clearPattern('products:*');

    // Generate and update embedding if search text changed
    if (searchText) {
      try {
        const vector = await this.aiService.generateEmbedding(searchText);
        await this.prisma.product.update({
          where: { id },
          data: { embedding: JSON.stringify(vector) },
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        this.logger.warn('Failed to update embedding for product', {
          productId: id,
          error: errorMessage,
        });
      }
    }

    return updated;
  }

  /**
   * Delete product
   */
  async remove(id: string) {
    // Check if product exists
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    // Clear cache
    await this.redis.clearPattern('products:*');

    return { message: 'Product deleted successfully' };
  }

  /**
   * Get products by category
   */
  async findByCategory(category: string, limit: number = 50) {
    const products = await this.prisma.product.findMany({
      where: { category },
      take: limit,
      include: {
        images: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products;
  }

  /**
   * Get low stock products
   */
  async getLowStock(locationId?: string) {
    // Simplified query - just get products with low inventory
    const products = await this.prisma.product.findMany({
      where: {
        inventory: {
          some: locationId ? { locationId } : {},
        },
      },
      include: {
        inventory: {
          where: locationId ? { locationId } : undefined,
          include: {
            location: true,
          },
        },
      },
    });

    // Filter for low stock (quantity <= reorderPoint)
    return products.filter((p) =>
      p.inventory.some((inv) => inv.reorderPoint !== null && inv.quantity <= inv.reorderPoint),
    );
  }

  /**
   * AI-powered semantic search using Local Embeddings (ContextIQ style)
   */
  async searchWithAI(query: string, limit: number = 20): Promise<ProductWithScore[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.aiService.generateEmbedding(query);

      // Get all products that have embeddings
      const products = await this.prisma.product.findMany({
        where: {
          embedding: { not: null },
        },
      });

      if (products.length === 0) {
        this.logger.debug('No embeddings found, returning regular search');
        const searchResults = await this.search({ query, limit });
        return searchResults.map((p) => ({ ...p, similarity: 0 }));
      }

      // Calculate semantic scores
      const productsWithScores = products.map((product): ProductWithScore => {
        let similarity = 0;
        try {
          const embeddingStr = product.embedding;
          if (embeddingStr) {
            const productEmbedding = JSON.parse(embeddingStr) as number[];
            similarity = this.aiService.cosineSimilarity(queryEmbedding, productEmbedding);
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_err) {
          this.logger.warn('Failed to parse embedding for product', {
            productId: product.id,
          });
        }
        return { ...product, similarity } as ProductWithScore;
      });

      // HYBRID LOGIC: Boost score if keywords match
      const lowerQuery = query.toLowerCase();
      const results = productsWithScores.map((product): ProductWithScore => {
        let score = product.similarity || 0;

        // Boost for exact name match
        if (product.name.toLowerCase().includes(lowerQuery)) {
          score += 0.2;
        }
        // Boost for category match
        if (product.category.toLowerCase().includes(lowerQuery)) {
          score += 0.15;
        }

        return { ...product, finalScore: score };
      });

      // Filter and sort
      return results
        .filter((r) => (r.finalScore || 0) > 0.4) // Lower threshold for testing
        .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
        .slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('AI search failed, falling back to regular search', undefined, {
        error: errorMessage,
      });
      const searchResults = await this.search({ query, limit });
      return searchResults.map((p) => ({ ...p, similarity: 0 }));
    }
  }
}
