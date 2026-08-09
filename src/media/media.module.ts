import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminMediaController } from './admin-media.controller';
import { MediaService } from './media.service';

// AdminModule supplies AdminAuditService and registers the admin-jwt strategy
// that this controller's guards depend on.
@Module({
  imports: [AdminModule],
  controllers: [AdminMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
