import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';

/**
 * Whether to believe `X-Forwarded-For`.
 *
 * On a managed host the app never sees a client address directly — every
 * request arrives from the platform's proxy. Without this, `request.ip` is that
 * one proxy for everybody, which quietly turns every per-IP limit into a global
 * one: a single shared rate limit for all traffic, five enquiries an hour for
 * the entire world, eight recovery attempts for everyone at once.
 *
 * It is not on by default outside production, because trusting the header when
 * nothing is in front of the app lets any caller claim any address.
 */
function resolveTrustProxy(): boolean | number {
  const configured = process.env.TRUST_PROXY?.trim();

  if (configured === undefined || configured === '') {
    return process.env.NODE_ENV === 'production';
  }
  if (configured === 'true') return true;
  if (configured === 'false') return false;

  const hops = Number(configured);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: resolveTrustProxy() }),
  );
  const config = app.get(ConfigService);

  await app.register(helmet);
  await app.register(cookie);
  const configuredCorsOrigins = config
    .getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (configuredCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const isLocalhostOrigin =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (!isProduction && isLocalhostOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  const rateLimitMax = isProduction
    ? config.getOrThrow<number>('RATE_LIMIT_MAX')
    : Math.max(config.getOrThrow<number>('RATE_LIMIT_MAX'), 1000);
  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: config.getOrThrow<string>('RATE_LIMIT_TIME_WINDOW'),
  });

  // One file per request, capped. The media controller rejects anything that
  // is not an image before a byte reaches storage.
  await app.register(multipart, {
    limits: {
      files: 1,
      fields: 4,
      fileSize: config.getOrThrow<number>('STORAGE_MAX_UPLOAD_BYTES'),
    },
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sudo API')
    .setDescription('Backend API for Sudo Tech Labs digital platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
