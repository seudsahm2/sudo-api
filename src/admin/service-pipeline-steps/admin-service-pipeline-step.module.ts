import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminServicePipelineStepController } from './admin-service-pipeline-step.controller';
import { AdminServicePipelineStepService } from './admin-service-pipeline-step.service';

@Module({
  controllers: [AdminServicePipelineStepController],
  providers: [AdminServicePipelineStepService, AdminAuditService],
})
export class AdminServicePipelineStepModule {}
