import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmbeddingService {
  private readonly url?: string;
  private readonly connectTimeoutMs: number;
  private readonly readTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    const appCfg = this.config.get<{
      oracleEmbed?: {
        url?: string;
        connectTimeoutMs?: number;
        readTimeoutMs?: number;
      };
    }>('app');
    this.url = appCfg?.oracleEmbed?.url;
    this.connectTimeoutMs = appCfg?.oracleEmbed?.connectTimeoutMs ?? 3000;
    this.readTimeoutMs = appCfg?.oracleEmbed?.readTimeoutMs ?? 7000;
  }

  async embedText(text: string): Promise<{
    model: string;
    dim: number;
    embedding: number[];
  }> {
    if (!this.url) {
      throw new ServiceUnavailableException(
        'Oracle embed service not configured',
      );
    }
    const endpoint = `${this.url.replace(/\/$/, '')}/embed`;
    try {
      const res = await axios.post(
        endpoint,
        { text },
        { timeout: this.readTimeoutMs },
      );
      const data = res.data as {
        model: string;
        dim: number;
        embedding: number[];
      };
      if (
        !data ||
        !Array.isArray(data.embedding) ||
        typeof data.dim !== 'number'
      ) {
        throw new Error('Invalid embed response');
      }
      return data;
    } catch {
      throw new ServiceUnavailableException('Embedding service unavailable');
    }
  }
}
