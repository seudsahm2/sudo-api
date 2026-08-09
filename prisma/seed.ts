import { PrismaClient } from '@prisma/client';
import { defaultContentBundle } from '../src/content/default-content.bundle';

const prisma = new PrismaClient();

const adminPermissions = [
  {
    key: 'admin:auth:manage',
    resource: 'auth',
    action: 'manage',
    description: 'Manage admin authentication and session state',
  },
  {
    key: 'admin:users:manage',
    resource: 'admin_users',
    action: 'manage',
    description: 'Manage admin users',
  },
  {
    key: 'admin:roles:manage',
    resource: 'admin_roles',
    action: 'manage',
    description: 'Manage admin roles',
  },
  {
    key: 'admin:permissions:manage',
    resource: 'admin_permissions',
    action: 'manage',
    description: 'Manage admin permissions',
  },
  {
    key: 'admin:sessions:manage',
    resource: 'admin_sessions',
    action: 'manage',
    description: 'Manage admin sessions',
  },
  {
    key: 'admin:audit:read',
    resource: 'admin_audit_logs',
    action: 'read',
    description: 'Read admin audit logs',
  },
  {
    key: 'content:read',
    resource: 'content',
    action: 'read',
    description: 'Read content records',
  },
  {
    key: 'content:write',
    resource: 'content',
    action: 'write',
    description: 'Create and update content records',
  },
  {
    key: 'content:delete',
    resource: 'content',
    action: 'delete',
    description: 'Delete content records',
  },
  {
    key: 'content:restore',
    resource: 'content',
    action: 'restore',
    description: 'Restore content records',
  },
  {
    key: 'content:bulk',
    resource: 'content',
    action: 'bulk',
    description: 'Perform bulk content operations',
  },
  {
    key: 'content:publish',
    resource: 'content',
    action: 'publish',
    description: 'Publish content changes',
  },
];

const adminRoles = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Full control over the admin platform and content data',
    isSystem: true,
  },
  {
    key: 'content_editor',
    name: 'Content Editor',
    description: 'Can manage content records but not security settings',
    isSystem: true,
  },
  {
    key: 'auditor',
    name: 'Auditor',
    description: 'Read-only access to audit and content views',
    isSystem: true,
  },
];

async function resetContentTables() {
  await prisma.$transaction([
    prisma.adminAuditLog.deleteMany(),
    prisma.adminSession.deleteMany(),
    prisma.adminUserRole.deleteMany(),
    prisma.adminRolePermission.deleteMany(),
    prisma.adminPermission.deleteMany(),
    prisma.adminRole.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.homeManifesto.deleteMany(),
    prisma.homeEcosystemTag.deleteMany(),
    prisma.homeStat.deleteMany(),
    prisma.serviceCapability.deleteMany(),
    prisma.serviceStackItem.deleteMany(),
    prisma.serviceInterconnect.deleteMany(),
    prisma.service.deleteMany(),
    prisma.servicePipelineStep.deleteMany(),
    prisma.workProjectDiscipline.deleteMany(),
    prisma.workProject.deleteMany(),
    prisma.workFilter.deleteMany(),
    prisma.labPrinciple.deleteMany(),
    prisma.labMatrixRow.deleteMany(),
    prisma.labSpec.deleteMany(),
    prisma.primaryNavigation.deleteMany(),
    prisma.inquiryProjectType.deleteMany(),
    prisma.inquiryBudgetRange.deleteMany(),
    prisma.siteConfig.deleteMany(),
  ]);
}

async function seedAdminSection() {
  await prisma.adminPermission.createMany({
    data: adminPermissions,
  });

  await prisma.adminRole.createMany({
    data: adminRoles,
  });

  const allPermissions = await prisma.adminPermission.findMany();
  const allRoles = await prisma.adminRole.findMany();

  const superAdminRole = allRoles.find((role) => role.key === 'super_admin');
  const contentEditorRole = allRoles.find((role) => role.key === 'content_editor');
  const auditorRole = allRoles.find((role) => role.key === 'auditor');

  if (!superAdminRole || !contentEditorRole || !auditorRole) {
    throw new Error('Failed to seed admin roles');
  }

  await prisma.adminRolePermission.createMany({
    data: allPermissions.map((permission, index) => ({
      adminRoleId: superAdminRole.id,
      adminPermissionId: permission.id,
    })),
  });

  const contentPermissions = allPermissions.filter((permission) =>
    permission.key.startsWith('content:'),
  );
  const auditPermission = allPermissions.find(
    (permission) => permission.key === 'admin:audit:read',
  );

  await prisma.adminRolePermission.createMany({
    data: contentPermissions.map((permission) => ({
      adminRoleId: contentEditorRole.id,
      adminPermissionId: permission.id,
    })),
  });

  if (auditPermission) {
    await prisma.adminRolePermission.create({
      data: {
        adminRoleId: auditorRole.id,
        adminPermissionId: auditPermission.id,
      },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@sudotechlabs.com';
  const adminPasswordHash =
    process.env.ADMIN_PASSWORD_HASH ??
    '$2b$10$JfQb6T4vrA2aTQdzYJ8m5eY4i8VmEvFziW0o0zjY2xXn47jRd5GRe';

  const adminUser = await prisma.adminUser.create({
    data: {
      email: adminEmail,
      displayName: 'Sudo Admin',
      passwordHash: adminPasswordHash,
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  await prisma.adminUserRole.create({
    data: {
      adminUserId: adminUser.id,
      adminRoleId: superAdminRole.id,
    },
  });
}

async function seedSiteSection() {
  const site = defaultContentBundle.siteConfig;

  await prisma.siteConfig.create({
    data: {
      name: site.name,
      shortName: site.shortName,
      descriptor: site.descriptor,
      defaultTitle: site.defaultTitle,
      description: site.description,
      contactEmail: site.contactEmail,
      responseWindow: site.responseWindow,
      statusLabel: site.statusLabel,
      intakeMode: site.intakeMode,
      heroHeadline: site.heroHeadline,
      positionTitle: site.positionTitle,
      positionBody: site.positionBody,
    },
  });

  await prisma.primaryNavigation.createMany({
    data: defaultContentBundle.primaryNavigation.map((item, index) => ({
      position: index,
      to: item.to,
      label: item.label,
    })),
  });

  await prisma.inquiryProjectType.createMany({
    data: defaultContentBundle.inquiryOptions.projectTypes.map((item, index) => ({
      position: index,
      value: item.value,
      label: item.label,
    })),
  });

  await prisma.inquiryBudgetRange.createMany({
    data: defaultContentBundle.inquiryOptions.budgetRanges.map((item, index) => ({
      position: index,
      value: item.value,
      label: item.label,
    })),
  });
}

async function seedHomeSection() {
  await prisma.homeManifesto.createMany({
    data: defaultContentBundle.home.manifesto.map((item, index) => ({
      position: index,
      icon: item.icon,
      kicker: item.kicker,
      title: item.title,
      copy: item.copy,
    })),
  });

  await prisma.homeEcosystemTag.createMany({
    data: defaultContentBundle.home.ecosystemTags.map((tag, index) => ({
      position: index,
      tag,
    })),
  });

  await prisma.homeStat.createMany({
    data: defaultContentBundle.home.stats.map((item, index) => ({
      position: index,
      label: item.label,
      value: item.value,
      suffix: 'suffix' in item ? item.suffix : null,
    })),
  });
}

async function seedServiceSection() {
  for (const [index, service] of defaultContentBundle.services.services.entries()) {
    const created = await prisma.service.create({
      data: {
        position: index,
        icon: service.icon,
        name: service.name,
        handle: service.handle,
        summary: service.summary,
      },
    });

    await prisma.serviceCapability.createMany({
      data: service.capabilities.map((capability, capabilityIndex) => ({
        serviceId: created.id,
        position: capabilityIndex,
        value: capability,
      })),
    });

    await prisma.serviceStackItem.createMany({
      data: service.stack.map((stackItem, stackIndex) => ({
        serviceId: created.id,
        position: stackIndex,
        value: stackItem,
      })),
    });

    await prisma.serviceInterconnect.createMany({
      data: service.interconnects.map((interconnect, interconnectIndex) => ({
        serviceId: created.id,
        position: interconnectIndex,
        value: interconnect,
      })),
    });
  }

  await prisma.servicePipelineStep.createMany({
    data: defaultContentBundle.services.pipeline.map((step, index) => ({
      position: index,
      icon: step.icon,
      label: step.label,
      step: step.step,
    })),
  });
}

async function seedWorkSection() {
  await prisma.workFilter.createMany({
    data: defaultContentBundle.work.filters.map((filter, index) => ({
      position: index,
      value: filter,
    })),
  });

  for (const [index, project] of defaultContentBundle.work.projects.entries()) {
    const created = await prisma.workProject.create({
      data: {
        position: index,
        projectKey: project.id,
        title: project.title,
        client: project.client,
        year: project.year,
        summary: project.summary,
        coverImageUrl: project.coverImageUrl || null,
        challenge: project.challenge || null,
        approach: project.approach || null,
        outcome: project.outcome || null,
        featured: index < 3,
        featuredPosition: index < 3 ? index : null,
      },
    });

    await prisma.workProjectDiscipline.createMany({
      data: project.discipline.map((discipline, disciplineIndex) => ({
        projectId: created.id,
        position: disciplineIndex,
        value: discipline,
      })),
    });
  }
}

async function seedLabSection() {
  await prisma.labPrinciple.createMany({
    data: defaultContentBundle.lab.principles.map((principle, index) => ({
      position: index,
      icon: principle.icon,
      name: principle.name,
      desc: principle.desc,
    })),
  });

  await prisma.labMatrixRow.createMany({
    data: defaultContentBundle.lab.matrix.map(([label, value], index) => ({
      position: index,
      label,
      value,
    })),
  });

  await prisma.labSpec.createMany({
    data: defaultContentBundle.lab.labSpecs.map(([label, value], index) => ({
      position: index,
      label,
      value,
    })),
  });
}

async function main() {
  await resetContentTables();
  await seedAdminSection();
  await seedSiteSection();
  await seedHomeSection();
  await seedServiceSection();
  await seedWorkSection();
  await seedLabSection();
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
