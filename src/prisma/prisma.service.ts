import {
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const HARD_DELETE_PROTECTED_MODELS = new Set([
  'SiteConfig',
  'PrimaryNavigation',
  'InquiryProjectType',
  'InquiryBudgetRange',
  'HomeManifesto',
  'HomeEcosystemTag',
  'HomeStat',
  'Service',
  'ServicePipelineStep',
  'WorkFilter',
  'WorkProject',
  'LabPrinciple',
  'LabMatrixRow',
  'LabSpec',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  onModuleInit(): void {
    const extendedClient = this.$extends({
      query: {
        $allModels: {
          async delete({ model, query, args }) {
            if (model && HARD_DELETE_PROTECTED_MODELS.has(model)) {
              throw new ForbiddenException(
                `Hard delete is disabled for ${model}. Use soft delete by setting deletedAt.`,
              );
            }

            return query(args);
          },
          async deleteMany({ model, query, args }) {
            if (model && HARD_DELETE_PROTECTED_MODELS.has(model)) {
              throw new ForbiddenException(
                `Hard delete is disabled for ${model}. Use soft delete by setting deletedAt.`,
              );
            }

            return query(args);
          },
        },
      },
    });

    Object.assign(this, extendedClient);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
