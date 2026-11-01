import {
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ContentModule } from '../content/content.module';
import { OgService, isOgPage } from './og.service';

/**
 * GET /api/og/page/<page>.png, /api/og/project/<key>.png and
 * /api/og/service/<slug>.png — the images the site names in og:image.
 */
@ApiExcludeController()
@Controller('og')
export class OgController {
  constructor(private readonly og: OgService) {}

  @Get(':kind/:file')
  async image(
    @Param('kind') kind: string,
    @Param('file') file: string,
    @Res() reply: FastifyReply,
  ) {
    const key = file.replace(/\.png$/, '');
    const png =
      kind === 'page' && isOgPage(key)
        ? await this.og.page(key)
        : kind === 'project'
          ? await this.og.project(key)
          : kind === 'service'
            ? await this.og.service(key)
            : null;
    if (!png) throw new NotFoundException();

    // Crawlers fetch from anywhere; helmet's same-origin policy would block
    // the image being shown inside a chat app's preview.
    reply.raw.removeHeader('cross-origin-resource-policy');
    reply.header('cross-origin-resource-policy', 'cross-origin');
    reply.header('content-type', 'image/png');
    reply.header(
      'cache-control',
      'public, max-age=3600, stale-while-revalidate=86400',
    );
    return reply.send(png);
  }
}

@Module({
  imports: [ContentModule],
  controllers: [OgController],
  providers: [OgService],
})
export class OgModule {}
