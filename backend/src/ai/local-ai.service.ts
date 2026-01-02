import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class LocalAIService implements OnModuleInit {
  private readonly logger = new Logger(LocalAIService.name);
  private pipe: any;

  async onModuleInit() {
    this.logger.log('Initializing Local AI Service (Xenova/transformers)...');
    try {
      // Dynamic import for ESM (Transformers.js is ESM only)
      const { pipeline } = await import('@xenova/transformers');

      // Use the same model as ContextIQ (or similar efficient one)
      // 'feature-extraction' task returns the embedding
      this.logger.log('Loading model: Xenova/all-MiniLM-L6-v2...');
      this.pipe = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );
      this.logger.log('Local AI Model loaded successfully.');
    } catch (error) {
      this.logger.error('Failed to load Local AI model:', error);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipe) {
      this.logger.warn('Model not loaded yet, attempting to lazy load...');
      const { pipeline } = await import('@xenova/transformers');
      this.pipe = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );
    }

    // Generate embedding
    // pooling: 'mean' and normalize: true are standard for semantic search
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const output = (await this.pipe(text, {
      pooling: 'mean',
      normalize: true,
    })) as { data: Float32Array };

    // Output.data is a Float32Array, convert to normal array
    return Array.from(output.data as Iterable<number>);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}
