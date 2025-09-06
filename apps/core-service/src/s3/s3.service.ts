import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

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

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
    });
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.bucket) {
      throw new Error('S3 bucket is not configured (AWS_S3_BUCKET)');
    }
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    });
    await this.client.send(cmd);
  }
}
