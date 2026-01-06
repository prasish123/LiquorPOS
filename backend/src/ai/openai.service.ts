import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { LoggerService } from '../common/logger.service';

@Injectable()
export class OpenAIService {
  private openai: OpenAI | null = null;
  private readonly logger = new LoggerService('OpenAIService');

  constructor() {
    // Only initialize if API key is provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.logger.warn('OPENAI_API_KEY not set - AI search will fall back to regular search');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error generating embedding', undefined, {
        error: errorMessage,
      });
      throw error;
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
