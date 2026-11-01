import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Return all frontend content payloads' })
  async getAll() {
    return this.contentService.getAll();
  }

  @Get('site')
  @ApiOperation({ summary: 'Return shared site configuration and navigation' })
  async getSite() {
    return this.contentService.getSite();
  }

  @Get('home')
  @ApiOperation({ summary: 'Return home page content' })
  async getHome() {
    return this.contentService.getHome();
  }

  @Get('services')
  @ApiOperation({ summary: 'Return services page content' })
  async getServices() {
    return this.contentService.getServices();
  }

  @Get('work')
  @ApiOperation({ summary: 'Return work page content' })
  async getWork() {
    return this.contentService.getWork();
  }

  @Get('lab')
  @ApiOperation({ summary: 'Return lab page content' })
  async getLab() {
    return this.contentService.getLab();
  }

  @Get('prototypes/:projectKey')
  @ApiOperation({
    summary: "Return a published project's tap-through prototype",
  })
  async getPrototype(@Param('projectKey') projectKey: string) {
    return this.contentService.getPrototype(projectKey);
  }
}
