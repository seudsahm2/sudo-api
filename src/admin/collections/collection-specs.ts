import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  CollectionDelegate,
  CollectionSpec,
  LINK_PATTERN,
  MEDIA_PATTERN,
  SLUG_PATTERN,
} from './collection-spec';

/** Prisma's delegates are structurally what the engine needs. */
const delegate = (pick: (prisma: PrismaService) => unknown) =>
  pick as (prisma: PrismaService) => CollectionDelegate;

async function assertProjectExists(prisma: PrismaService, projectKey: unknown) {
  if (typeof projectKey !== 'string' || !projectKey) return;
  const project = await prisma.workProject.findUnique({
    where: { projectKey },
    select: { id: true },
  });
  if (!project) {
    throw new BadRequestException(
      `No project has the key "${projectKey}". Use the key from the project's address.`,
    );
  }
}

export const SITE_COPY_KINDS = ['text', 'longtext', 'url'] as const;

export const siteCopySpec: CollectionSpec = {
  entity: 'site_copy',
  label: 'Site text',
  path: 'site-copy',
  delegate: delegate((prisma) => prisma.siteCopy),
  fields: [
    {
      key: 'key',
      type: 'string',
      required: true,
      maxLength: 120,
      pattern: /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/,
      patternMessage: 'must look like page.section.name, in lower case.',
    },
    { key: 'page', type: 'string', required: true, maxLength: 40 },
    { key: 'section', type: 'string', required: true, maxLength: 60 },
    { key: 'label', type: 'string', required: true, maxLength: 120 },
    { key: 'value', type: 'string', required: true, maxLength: 2000 },
    {
      key: 'kind',
      type: 'enum',
      options: SITE_COPY_KINDS,
      defaultValue: 'text',
    },
    { key: 'helpText', type: 'string', maxLength: 300 },
    { key: 'position', type: 'number', integer: true, min: 0, defaultValue: 0 },
  ],
  searchFields: ['key', 'label', 'value', 'page', 'section'],
  sortFields: ['position', 'key', 'page', 'updatedAt'],
  defaultSort: 'position',
  conflictMessage: 'That key is already in use.',
  validate(_prisma, record) {
    if (record.kind === 'url' && typeof record.value === 'string') {
      if (!LINK_PATTERN.test(record.value) && !record.value.startsWith('/')) {
        throw new BadRequestException(
          'value must be a full https:// address or a path starting with /.',
        );
      }
    }
    return Promise.resolve();
  },
};

export const testimonialSpec: CollectionSpec = {
  entity: 'testimonial',
  label: 'Testimonial',
  path: 'testimonials',
  filterFields: ['projectKey'],
  delegate: delegate((prisma) => prisma.testimonial),
  fields: [
    { key: 'position', type: 'number', integer: true, min: 0, required: true },
    { key: 'quote', type: 'string', required: true, maxLength: 600 },
    { key: 'name', type: 'string', required: true, maxLength: 120 },
    { key: 'role', type: 'string', required: true, maxLength: 120 },
    { key: 'company', type: 'string', required: true, maxLength: 120 },
    {
      key: 'avatarUrl',
      type: 'string',
      maxLength: 500,
      pattern: MEDIA_PATTERN,
      patternMessage: 'must be an http(s) address or a path starting with /.',
    },
    { key: 'projectKey', type: 'string', maxLength: 120 },
    { key: 'featured', type: 'boolean', defaultValue: true },
  ],
  searchFields: ['quote', 'name', 'company', 'role'],
  sortFields: ['position', 'name', 'company', 'createdAt', 'updatedAt'],
  defaultSort: 'position',
  async validate(prisma, record) {
    await assertProjectExists(prisma, record.projectKey);
  },
};

export const clientLogoSpec: CollectionSpec = {
  entity: 'client_logo',
  label: 'Client',
  path: 'client-logos',
  delegate: delegate((prisma) => prisma.clientLogo),
  fields: [
    { key: 'position', type: 'number', integer: true, min: 0, required: true },
    { key: 'name', type: 'string', required: true, maxLength: 120 },
    {
      key: 'logoUrl',
      type: 'string',
      maxLength: 500,
      pattern: MEDIA_PATTERN,
      patternMessage: 'must be an http(s) address or a path starting with /.',
    },
    {
      key: 'siteUrl',
      type: 'string',
      maxLength: 500,
      pattern: LINK_PATTERN,
      patternMessage: 'must be a full http(s) address.',
    },
    { key: 'outcomeValue', type: 'string', maxLength: 32 },
    { key: 'outcomeLabel', type: 'string', maxLength: 120 },
  ],
  searchFields: ['name', 'outcomeLabel'],
  sortFields: ['position', 'name', 'createdAt', 'updatedAt'],
  defaultSort: 'position',
};

export const faqSpec: CollectionSpec = {
  entity: 'faq',
  label: 'Question',
  path: 'faqs',
  delegate: delegate((prisma) => prisma.faq),
  fields: [
    { key: 'position', type: 'number', integer: true, min: 0, required: true },
    {
      key: 'scope',
      type: 'string',
      maxLength: 80,
      defaultValue: 'home',
      pattern: /^(home|services|contact|work|service:[a-z0-9-]+)$/,
      patternMessage:
        'must be home, services, contact, work, or service:<slug> for one service page.',
    },
    { key: 'question', type: 'string', required: true, maxLength: 240 },
    { key: 'answer', type: 'string', required: true, maxLength: 2000 },
  ],
  searchFields: ['question', 'answer', 'scope'],
  sortFields: ['position', 'scope', 'createdAt', 'updatedAt'],
  defaultSort: 'position',
};

export const workProjectHighlightSpec: CollectionSpec = {
  entity: 'work_project_highlight',
  label: 'Highlight',
  path: 'work-project-highlights',
  filterFields: ['projectKey'],
  delegate: delegate((prisma) => prisma.workProjectHighlight),
  fields: [
    { key: 'projectKey', type: 'string', required: true, maxLength: 120 },
    { key: 'position', type: 'number', integer: true, min: 0, required: true },
    { key: 'title', type: 'string', required: true, maxLength: 120 },
    { key: 'body', type: 'string', required: true, maxLength: 600 },
    {
      key: 'mediaUrl',
      type: 'string',
      maxLength: 500,
      pattern: MEDIA_PATTERN,
      patternMessage: 'must be an http(s) address or a path starting with /.',
    },
  ],
  searchFields: ['projectKey', 'title', 'body'],
  sortFields: ['position', 'projectKey', 'createdAt', 'updatedAt'],
  defaultSort: 'position',
  async validate(prisma, record) {
    await assertProjectExists(prisma, record.projectKey);
  },
};

export const PROTOTYPE_STATUS_BAR_TONES = ['dark', 'light'] as const;

export const prototypeScreenSpec: CollectionSpec = {
  entity: 'prototype_screen',
  label: 'Prototype screen',
  path: 'prototype-screens',
  filterFields: ['projectKey'],
  delegate: delegate((prisma) => prisma.prototypeScreen),
  fields: [
    { key: 'projectKey', type: 'string', required: true, maxLength: 120 },
    {
      key: 'screenKey',
      type: 'string',
      required: true,
      maxLength: 80,
      pattern: SLUG_PATTERN,
      patternMessage:
        'must be lower case words joined by hyphens, e.g. "home" or "order-details".',
    },
    { key: 'position', type: 'number', integer: true, min: 0, required: true },
    { key: 'title', type: 'string', required: true, maxLength: 120 },
    {
      key: 'imageUrl',
      type: 'string',
      required: true,
      maxLength: 500,
      pattern: MEDIA_PATTERN,
      patternMessage: 'must be an http(s) address or a path starting with /.',
    },
    {
      key: 'width',
      type: 'number',
      integer: true,
      min: 1,
      max: 10000,
      required: true,
    },
    {
      key: 'height',
      type: 'number',
      integer: true,
      min: 1,
      max: 40000,
      required: true,
    },
    { key: 'isStart', type: 'boolean', defaultValue: false },
    { key: 'scrollable', type: 'boolean', defaultValue: false },
    {
      key: 'statusBarTone',
      type: 'enum',
      options: PROTOTYPE_STATUS_BAR_TONES,
      defaultValue: 'dark',
    },
  ],
  searchFields: ['projectKey', 'screenKey', 'title'],
  sortFields: ['position', 'projectKey', 'screenKey', 'createdAt', 'updatedAt'],
  defaultSort: 'position',
  conflictMessage: 'This project already has a screen with that key.',
  async validate(prisma, record) {
    await assertProjectExists(prisma, record.projectKey);
  },
  // A prototype has exactly one way in.
  async afterWrite(prisma, row) {
    if (row.isStart !== true) return;
    await prisma.prototypeScreen.updateMany({
      where: {
        projectKey: row.projectKey as string,
        id: { not: row.id },
        isStart: true,
      },
      data: { isStart: false },
    });
  },
};

export const PROTOTYPE_HOTSPOT_ACTIONS = ['goto', 'back', 'url'] as const;
export const PROTOTYPE_TRANSITIONS = ['push', 'modal', 'fade', 'none'] as const;

export const prototypeHotspotSpec: CollectionSpec = {
  entity: 'prototype_hotspot',
  label: 'Hotspot',
  path: 'prototype-hotspots',
  filterFields: ['screenId'],
  delegate: delegate((prisma) => prisma.prototypeHotspot),
  fields: [
    { key: 'screenId', type: 'string', required: true, maxLength: 40 },
    { key: 'position', type: 'number', integer: true, min: 0, defaultValue: 0 },
    { key: 'x', type: 'number', min: 0, max: 1, required: true },
    { key: 'y', type: 'number', min: 0, max: 1, required: true },
    { key: 'w', type: 'number', min: 0.005, max: 1, required: true },
    { key: 'h', type: 'number', min: 0.002, max: 1, required: true },
    {
      key: 'action',
      type: 'enum',
      options: PROTOTYPE_HOTSPOT_ACTIONS,
      defaultValue: 'goto',
    },
    { key: 'targetScreenKey', type: 'string', maxLength: 80 },
    {
      key: 'url',
      type: 'string',
      maxLength: 500,
      pattern: LINK_PATTERN,
      patternMessage: 'must be a full http(s) address.',
    },
    {
      key: 'transition',
      type: 'enum',
      options: PROTOTYPE_TRANSITIONS,
      defaultValue: 'push',
    },
    { key: 'label', type: 'string', maxLength: 80 },
  ],
  searchFields: ['label', 'targetScreenKey'],
  sortFields: ['position', 'createdAt', 'updatedAt'],
  defaultSort: 'position',
  missingReferenceMessage: 'That screen does not exist.',
  async validate(prisma, record) {
    const x = record.x as number;
    const y = record.y as number;
    // A small tolerance: rectangles drawn to the very edge round past 1.
    if (x + (record.w as number) > 1.001 || y + (record.h as number) > 1.001) {
      throw new BadRequestException(
        'The hotspot runs off the edge of the screen.',
      );
    }

    const screen = await prisma.prototypeScreen.findUnique({
      where: { id: record.screenId as string },
      select: { projectKey: true },
    });
    if (!screen) {
      throw new BadRequestException('That screen does not exist.');
    }

    if (record.action === 'goto') {
      const target = record.targetScreenKey;
      if (typeof target !== 'string' || !target) {
        throw new BadRequestException(
          'Choose which screen this hotspot opens.',
        );
      }
      const exists = await prisma.prototypeScreen.findFirst({
        where: {
          projectKey: screen.projectKey,
          screenKey: target,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!exists) {
        throw new BadRequestException(
          `This app has no screen called "${target}".`,
        );
      }
    }

    if (record.action === 'url' && !record.url) {
      throw new BadRequestException('Give the address this hotspot opens.');
    }
  },
};
