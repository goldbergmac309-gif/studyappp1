import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const isTest = process.env.NODE_ENV === 'test';
  const rabbitUrl = isTest ? undefined : process.env.RABBITMQ_URL;
  const s3Bucket = isTest ? undefined : process.env.AWS_S3_BUCKET;
  const s3Endpoint = isTest ? undefined : process.env.AWS_S3_ENDPOINT;
  const forcePathStyle =
    process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ||
    process.env.AWS_S3_FORCE_PATH_STYLE === '1';

  return {
    jwtSecret: process.env.JWT_SECRET,
    internalApiKey: process.env.INTERNAL_API_KEY,
    rabbitmq: {
      url: rabbitUrl,
      queueName:
        process.env.RABBITMQ_QUEUE_NAME || 'document_processing_jobs',
      reindexQueueName:
        process.env.RABBITMQ_REINDEX_QUEUE_NAME || 'v2_reindexing_jobs',
    },
    s3: {
      region: process.env.AWS_REGION,
      bucket: s3Bucket,
      endpoint: s3Endpoint,
      forcePathStyle,
    },
  };
});
