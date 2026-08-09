import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, it } from '@jest/globals';
import request from 'supertest';
import { HealthModule } from './../src/health/health.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.init();
    const fastify = app
      .getHttpAdapter()
      .getInstance() as unknown as FastifyInstance;
    await fastify.ready();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/health')
      .expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
