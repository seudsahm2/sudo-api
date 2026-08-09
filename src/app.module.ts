import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './common/config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { ContentModule } from './content/content.module';
import { MediaModule } from './media/media.module';
import { RequestPathLoggerMiddleware } from './common/middleware/request-path-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    HealthModule,
    ContentModule,
    MediaModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestPathLoggerMiddleware).forRoutes({
      path: '*path',
      method: RequestMethod.ALL,
    });
  }
}
