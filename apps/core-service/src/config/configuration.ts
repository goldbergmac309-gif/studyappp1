import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  jwtSecret: process.env.JWT_SECRET,
  internalApiKey: process.env.INTERNAL_API_KEY,
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queueName: process.env.RABBITMQ_QUEUE_NAME || 'document_processing_jobs',
  },
  s3: {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle:
      process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ||
      process.env.AWS_S3_FORCE_PATH_STYLE === '1',
  },
}));
