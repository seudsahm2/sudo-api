import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';

interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
}

interface ResponseLike {
  statusCode?: number;
  once?: (event: string, listener: () => void) => void;
}

@Injectable()
export class RequestPathLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: RequestLike, res: ResponseLike, next: NextFunction): void {
    const method = req.method ?? 'UNKNOWN';
    const path = req.originalUrl ?? req.url ?? '/';
    const startedAt = Date.now();

    this.logger.log(`${method} ${path}`);

    if (typeof res.once === 'function') {
      res.once('finish', () => {
        const durationMs = Date.now() - startedAt;
        const statusCode = res.statusCode ?? 0;
        this.logger.log(`${method} ${path} -> ${statusCode} (${durationMs}ms)`);
      });
    }

    next();
  }
}
