import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { logger } from '@recoverai/observability';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Preserve raw buffer for webhook HMAC SHA-256 verification
    rawBody: true,
  });

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
          frameSrc: ["'self'", 'https://api.razorpay.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.razorpay.com'],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'sameorigin' },
      noSniff: true,
    })
  );

  // Parse cookies for secure httpOnly session tokens
  app.use(cookieParser());

  // CORS Configuration
  app.enableCors({
    origin: [
      process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Razorpay-Signature',
      'Idempotency-Key',
      'X-Requested-With',
    ],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.info(`RecoverAI API listening on port ${port}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Fatal error during API bootstrap');
  process.exit(1);
});
