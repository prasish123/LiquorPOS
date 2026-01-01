import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { LocalAIService } from '../ai/local-ai.service';
import { CreateProductDto, UpdateProductDto, SearchProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
    constructor(
        private prisma: PrismaService,
        private aiService: LocalAIService,
        private redis: RedisService,
    ) { }

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
            console.warn('Failed to generate local embedding:', error.message);
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
            return JSON.parse(cached);
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
            throw new NotFoundException(`Product with ID ${id} not found`);
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
            throw new NotFoundException(`Product with SKU ${sku} not found`);
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
            searchText = `${dto.name || existingProduct.name} ${dto.description || existingProduct.description || ''} ${dto.category || existingProduct.category}`.toLowerCase();
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
                    data: { embedding: JSON.stringify(vector) }
                });
            } catch (e) {
                console.warn(`Failed to update embedding for product ${id}:`, e);
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
        return products.filter(p =>
            p.inventory.some(inv =>
                inv.reorderPoint !== null && inv.quantity <= inv.reorderPoint
            )
        );
    }

    /**
     * AI-powered semantic search using Local Embeddings (ContextIQ style)
     */
    async searchWithAI(query: string, limit: number = 20) {
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
                console.log('No embeddings found, returning regular search');
                return this.search({ query, limit });
            }

            // Calculate semantic scores
            let productsWithScores = products.map((product: any) => {
                let similarity = 0;
                try {
                    const embeddingStr = product.embedding as string;
                    const productEmbedding = JSON.parse(embeddingStr);
                    similarity = this.aiService.cosineSimilarity(queryEmbedding, productEmbedding);
                } catch (e) {
                    console.warn(`Failed to parse embedding for product ${product.id}`);
                }
                return { ...product, similarity };
            });

            // HYBRID LOGIC: Boost score if keywords match
            const lowerQuery = query.toLowerCase();
            const results = productsWithScores.map((product: any) => {
                let score = product.similarity;

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
                .filter((r: any) => r.finalScore > 0.4) // Lower threshold for testing
                .sort((a: any, b: any) => b.finalScore - a.finalScore)
                .slice(0, limit);

        } catch (error) {
            console.error('AI search failed, falling back to regular search:', error);
            return this.search({ query, limit });
        }
    }
}
