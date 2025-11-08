import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const isTest = process.env.NODE_ENV === 'test';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rabbitUrl = isTest ? undefined : process.env.RABBITMQ_URL;
  const s3Bucket = isTest ? undefined : process.env.AWS_S3_BUCKET;
  const s3Endpoint = isTest ? undefined : process.env.AWS_S3_ENDPOINT;
  const forcePathStyle =
    process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ||
    process.env.AWS_S3_FORCE_PATH_STYLE === '1';

  return {
    jwtSecret: process.env.JWT_SECRET,
    // Legacy key (to be replaced by INTERNAL_API_SECRET for HMAC guard)
    internalApiKey: process.env.INTERNAL_API_KEY,
    // New secret used for HMAC signatures from oracle -> core-service
    internalApiSecret: process.env.INTERNAL_API_SECRET,
    // Cookies and refresh token hashing
    cookieSecret: process.env.COOKIE_SECRET,
    refreshTokenPepper: process.env.REFRESH_TOKEN_PEPPER,
    clientOrigin: process.env.CLIENT_ORIGIN,
    nodeEnv,
    uploads: {
      // Default 20 MB; can be overridden via env (bytes)
      maxFileSize:
        Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES) || 20 * 1024 * 1024,
    },
    engine: {
      dimension: Number(process.env.ENGINE_DIM) || 1536,
    },
    search: {
      maxOffset: Number(process.env.SEARCH_MAX_OFFSET) || 10_000,
    },
    rabbitmq: {
      url: rabbitUrl,
      queueName: process.env.RABBITMQ_QUEUE_NAME || 'document_processing_jobs',
      reindexQueueName:
        process.env.RABBITMQ_REINDEX_QUEUE_NAME || 'v2_reindexing_jobs',
      insightsQueueName:
        process.env.RABBITMQ_INSIGHTS_QUEUE_NAME || 'insights_session_jobs',
    },
    s3: {
      region: process.env.AWS_REGION,
      bucket: s3Bucket,
      endpoint: s3Endpoint,
      forcePathStyle,
    },
    oracleEmbed: {
      url: isTest ? undefined : process.env.ORACLE_EMBED_URL,
      connectTimeoutMs: Number(
        process.env.ORACLE_EMBED_CONNECT_TIMEOUT_MS || 3000,
      ),
      readTimeoutMs: Number(process.env.ORACLE_EMBED_READ_TIMEOUT_MS || 7000),
    },
    clamav: {
      enabled:
        process.env.CLAMAV_ENABLED === '1' ||
        process.env.CLAMAV_ENABLED === 'true' ||
        (!isTest && process.env.CLAMAV_ENABLED === undefined),
      host: process.env.CLAMAV_HOST || 'localhost',
      port: Number(process.env.CLAMAV_PORT) || 3310,
      connectTimeoutMs: Number(process.env.CLAMAV_CONNECT_TIMEOUT_MS) || 3000,
      readTimeoutMs: Number(process.env.CLAMAV_READ_TIMEOUT_MS) || 10000,
    },
  };
});
