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
  // crossOriginResourcePolicy must be cross-origin so the merchant/ops SPAs
  // on :3000/:3001 can read JSON from the API on :4000 (Helmet defaults to same-origin).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow localhost, 127.0.0.1, and configured web origins
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === (process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000') ||
        origin === (process.env.NEXT_PUBLIC_OPS_URL || 'http://localhost:3001')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Razorpay-Signature',
      'Idempotency-Key',
      'X-Requested-With',
      'x-demo-mode',
      'X-Demo-Mode',
      'traceparent',
      'tracestate',
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
