import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditModule } from './audit/admin-audit.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminRecoveryService } from './admin-recovery.service';
import { AdminHomeEcosystemTagModule } from './home-ecosystem-tags/admin-home-ecosystem-tag.module';
import { AdminHomeManifestoModule } from './home-manifestos/admin-home-manifesto.module';
import { AdminHomeStatModule } from './home-stats/admin-home-stat.module';
import { AdminInquiryModule } from './inquiries/admin-inquiry.module';
import { AdminInquiryBudgetRangeModule } from './inquiry-budget-ranges/admin-inquiry-budget-range.module';
import { AdminInquiryProjectTypeModule } from './inquiry-project-types/admin-inquiry-project-type.module';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminPermissionsGuard } from './guards/admin-permissions.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminLabMatrixRowModule } from './lab-matrix-rows/admin-lab-matrix-row.module';
import { AdminLabPrincipleModule } from './lab-principles/admin-lab-principle.module';
import { AdminLabSpecModule } from './lab-specs/admin-lab-spec.module';
import { AdminNavigationController } from './navigation/admin-navigation.controller';
import { AdminNavigationService } from './navigation/admin-navigation.service';
import { AdminContentOperationsModule } from './operations/admin-content-operations.module';
import { AdminSiteConfigModule } from './site-configs/admin-site-config.module';
import { AdminServiceModule } from './services/admin-service.module';
import { AdminServicePipelineStepModule } from './service-pipeline-steps/admin-service-pipeline-step.module';
import { AdminWorkFilterModule } from './work-filters/admin-work-filter.module';
import { AdminWorkProjectMediaModule } from './work-project-media/admin-work-project-media.module';
import { AdminWorkProjectModule } from './work-projects/admin-work-project.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'ADMIN_ACCESS_TOKEN_EXPIRES_IN',
          ) as StringValue,
        },
      }),
    }),
    AdminHomeEcosystemTagModule,
    AdminHomeManifestoModule,
    AdminHomeStatModule,
    AdminAuditModule,
    AdminInquiryModule,
    AdminInquiryBudgetRangeModule,
    AdminInquiryProjectTypeModule,
    AdminLabMatrixRowModule,
    AdminLabPrincipleModule,
    AdminLabSpecModule,
    AdminContentOperationsModule,
    AdminSiteConfigModule,
    AdminServiceModule,
    AdminServicePipelineStepModule,
    AdminWorkFilterModule,
    AdminWorkProjectModule,
    AdminWorkProjectMediaModule,
  ],
  controllers: [AdminAuthController, AdminNavigationController],
  providers: [
    AdminAuthService,
    AdminRecoveryService,
    AdminJwtStrategy,
    AdminAuditService,
    AdminNavigationService,
    AdminRolesGuard,
    AdminPermissionsGuard,
  ],
  exports: [AdminAuthService, AdminAuditService, AdminRecoveryService],
})
export class AdminModule {}
