import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminHomeManifestoController } from './admin-home-manifesto.controller';
import { AdminHomeManifestoService } from './admin-home-manifesto.service';

@Module({
  controllers: [AdminHomeManifestoController],
  providers: [AdminHomeManifestoService, AdminAuditService],
})
export class AdminHomeManifestoModule {}
