import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private bucketReady = false;

  constructor(private readonly config: ConfigService) {
    type AppConfig = {
      s3?: {
        region?: string;
        bucket?: string;
        endpoint?: string;
        forcePathStyle?: boolean;
      };
    };
    const appCfg = this.config.get<AppConfig>('app');
    const region = appCfg?.s3?.region;
    const endpoint = appCfg?.s3?.endpoint;
    const forcePathStyle = appCfg?.s3?.forcePathStyle ?? false;
    this.bucket = appCfg?.s3?.bucket as string;
    this.endpoint = endpoint || undefined;

    this.client = new S3Client({
      region,
      endpoint: this.endpoint,
      forcePathStyle,
    });
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.bucket) {
      throw new ServiceUnavailableException('S3 bucket is not configured');
    }
    // Ensure bucket exists (useful for local MinIO in tests/dev)
    if (!this.bucketReady) {
      await this.ensureBucket();
      this.bucketReady = true;
    }
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    });
    await this.client.send(cmd);
  }

  private async ensureBucket(): Promise<void> {
    // Production path: no endpoint configured -> do not attempt creation here
    if (!this.endpoint) {
      try {
        const head = new HeadBucketCommand({ Bucket: this.bucket });
        await this.client.send(head);
        return;
      } catch {
        throw new ServiceUnavailableException('S3 bucket not available');
      }
    }

    // Development path: try to create on missing
    try {
      const head = new HeadBucketCommand({ Bucket: this.bucket });
      await this.client.send(head);
      return;
    } catch {
      const create = new CreateBucketCommand({ Bucket: this.bucket });
      await this.client.send(create);
    }
  }

  /**
   * Simple health check: verify the configured bucket is reachable.
   * If no bucket is configured, return null so callers can decide policy.
   */
  async checkHealth(): Promise<boolean | null> {
    if (process.env.NODE_ENV === 'test') return null;
    if (!this.bucket) return null;
    try {
      const cmd = new HeadBucketCommand({ Bucket: this.bucket });
      await this.client.send(cmd);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a short-lived presigned URL for streaming/downloading a document.
   */
  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    if (!this.bucket) {
      throw new ServiceUnavailableException('S3 bucket is not configured');
    }
    // Ensure bucket exists (especially for local dev using MinIO)
    if (!this.bucketReady) {
      await this.ensureBucket();
      this.bucketReady = true;
    }
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    // Cast to any to avoid type mismatches between @aws-sdk subpackages in monorepo

    const url = await getSignedUrl(this.client as any, cmd as any, {
      expiresIn: expiresInSeconds,
    });
    return url;
  }
}
