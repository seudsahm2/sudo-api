import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuditService } from '../src/admin/admin-audit.service';
import { AdminCollectionService } from '../src/admin/collections/admin-collection.service';
import { AdminSiteCopyValuesController } from '../src/admin/collections/admin-site-copy-values.controller';
import {
  prototypeHotspotSpec,
  prototypeScreenSpec,
  siteCopySpec,
  testimonialSpec,
} from '../src/admin/collections/collection-specs';
import type { AdminPrincipal } from '../src/admin/interfaces/admin-principal.interface';
import { AdminWorkProjectService } from '../src/admin/work-projects/admin-work-project.service';
import { AdminOverviewService } from '../src/admin/overview/admin-overview.module';
import { ContentModule } from '../src/content/content.module';
import { ContentService } from '../src/content/content.service';
import { restoreSnapshot, takeSnapshot } from '../src/content/content-snapshot';
import { InquiriesModule } from '../src/inquiries/inquiries.module';
import { InquiriesService } from '../src/inquiries/inquiries.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * The redesign's content foundation, against a real Postgres.
 *
 * Builds only the modules under test rather than the whole app, and wipes the
 * tables it uses before running — so it refuses to start unless DATABASE_URL
 * points at a database whose name says it is for end-to-end tests.
 */
describe('Redesign content foundation (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let audit: AdminAuditService;
  let actor: AdminPrincipal;

  const collection = (spec: typeof siteCopySpec) =>
    new AdminCollectionService(spec, prisma, audit);

  const newProject = (overrides: Record<string, unknown> = {}) => ({
    position: Math.floor(Math.random() * 1_000_000),
    projectKey: `p-${Math.random().toString(36).slice(2, 10)}`,
    title: 'Delivery app',
    client: 'Acme Logistics',
    year: '2026',
    summary: 'Orders to the door in thirty minutes.',
    disciplines: ['Mobile'],
    ...overrides,
  });

  beforeAll(async () => {
    const url = process.env.DATABASE_URL ?? '';
    if (!/_e2e/.test(url)) {
      throw new Error(
        'Refusing to run: DATABASE_URL must name an _e2e database, because this suite deletes rows.',
      );
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        ContentModule,
        InquiriesModule,
      ],
      providers: [
        AdminAuditService,
        AdminWorkProjectService,
        AdminOverviewService,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    audit = moduleRef.get(AdminAuditService);

    // Children first.
    await prisma.prototypeHotspot.deleteMany();
    await prisma.prototypeScreen.deleteMany();
    await prisma.workProjectHighlight.deleteMany();
    await prisma.workProjectMedia.deleteMany();
    await prisma.workProjectDiscipline.deleteMany();
    await prisma.workProjectStackItem.deleteMany();
    await prisma.workProject.deleteMany();
    await prisma.homeStat.deleteMany();
    await prisma.siteCopy.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.inquiry.deleteMany();
    await prisma.adminAuditLog.deleteMany();

    const admin = await prisma.adminUser.upsert({
      where: { email: 'redesign-test@sudotechlabs.test' },
      update: {},
      create: {
        email: 'redesign-test@sudotechlabs.test',
        displayName: 'Redesign test',
        passwordHash: 'not-a-real-hash',
      },
    });
    actor = {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      sessionId: 'test',
      roleKeys: ['super_admin'],
      permissionKeys: [],
      twoFactorEnabled: false,
    };
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  describe('projects', () => {
    it('starts as a draft that the public site does not show', async () => {
      const projects = moduleRef.get(AdminWorkProjectService);
      const created = await projects.create(newProject(), actor);

      expect(created.status).toBe('draft');
      expect(created.publishedAt).toBeNull();

      const work = await moduleRef.get(ContentService).getWork();
      expect(work.projects.map((project) => project.id)).not.toContain(
        created.projectKey,
      );
    });

    it('derives the frame from platforms and stamps the first publication', async () => {
      const projects = moduleRef.get(AdminWorkProjectService);
      const created = await projects.create(
        newProject({ platforms: ['android', 'ios'], brandColor: '#17573f' }),
        actor,
      );
      expect(created.surface).toBe('mobile');
      expect(created.brandColor).toBe('#17573F');

      const published = await projects.update(
        created.id,
        {
          status: 'published',
          platforms: ['android', 'web'],
          expectedUpdatedAt: created.updatedAt,
        },
        actor,
      );
      expect(published.surface).toBe('both');
      expect(published.publishedAt).not.toBeNull();

      const cleared = await projects.update(
        created.id,
        { brandColor: '', expectedUpdatedAt: published.updatedAt },
        actor,
      );
      expect(cleared.brandColor).toBeNull();

      const work = await moduleRef.get(ContentService).getWork();
      const shown = work.projects.find(
        (project) => project.id === created.projectKey,
      );
      expect(shown?.platforms).toEqual(['android', 'web']);
    });
  });

  describe('figures', () => {
    it('counts from published work and hides a count of zero', async () => {
      await prisma.homeStat.createMany({
        data: [
          {
            position: 0,
            label: 'Projects shipped',
            value: 0,
            source: 'projects',
          },
          {
            position: 1,
            label: 'Mobile apps',
            value: 0,
            source: 'mobile_apps',
          },
          { position: 2, label: 'Industries', value: 0, source: 'industries' },
          { position: 3, label: 'Years', value: 4, source: 'manual' },
        ],
      });

      const published = await prisma.workProject.count({
        where: { deletedAt: null, status: 'published' },
      });
      const { stats } = await moduleRef.get(ContentService).getHome();

      expect(
        stats.find((stat) => stat.label === 'Projects shipped')?.value,
      ).toBe(published);
      expect(stats.find((stat) => stat.label === 'Mobile apps')?.value).toBe(1);
      // No project has an industry yet, so the figure is withheld.
      expect(stats.find((stat) => stat.label === 'Industries')).toBeUndefined();
      expect(stats.find((stat) => stat.label === 'Years')?.value).toBe(4);
    });
  });

  describe('prototype', () => {
    it('keeps one start screen, validates hotspots, and serves the flow', async () => {
      const projects = moduleRef.get(AdminWorkProjectService);
      const project = await projects.create(
        newProject({ status: 'published', platforms: ['android'] }),
        actor,
      );
      const screens = collection(prototypeScreenSpec);
      const hotspots = collection(prototypeHotspotSpec);

      const screen = (screenKey: string, isStart: boolean) =>
        screens.create(
          {
            projectKey: project.projectKey,
            screenKey,
            position: 0,
            title: screenKey,
            imageUrl: `/shots/${screenKey}.png`,
            width: 1080,
            height: 2400,
            isStart,
          },
          actor,
        );

      const home = await screen('home', true);
      const cart = await screen('cart', true);
      const homeAfter = await prisma.prototypeScreen.findUniqueOrThrow({
        where: { id: home.id as string },
      });
      expect(homeAfter.isStart).toBe(false);

      await expect(screen('cart', false)).rejects.toBeInstanceOf(
        ConflictException,
      );

      await expect(
        hotspots.create(
          {
            screenId: home.id,
            x: 0.9,
            y: 0.1,
            w: 0.2,
            h: 0.1,
            targetScreenKey: 'cart',
          },
          actor,
        ),
      ).rejects.toThrow('runs off the edge');

      await expect(
        hotspots.create(
          {
            screenId: home.id,
            x: 0.1,
            y: 0.1,
            w: 0.2,
            h: 0.1,
            targetScreenKey: 'nowhere',
          },
          actor,
        ),
      ).rejects.toThrow('no screen called "nowhere"');

      await hotspots.create(
        {
          screenId: home.id,
          x: 0.1,
          y: 0.8,
          w: 0.8,
          h: 0.08,
          targetScreenKey: 'cart',
          transition: 'modal',
        },
        actor,
      );
      await hotspots.create(
        { screenId: cart.id, x: 0, y: 0, w: 0.15, h: 0.06, action: 'back' },
        actor,
      );

      const flow = await moduleRef
        .get(ContentService)
        .getPrototype(project.projectKey);
      expect(flow.start).toBe('cart');
      expect(flow.screens).toHaveLength(2);
      expect(
        flow.screens.find((entry) => entry.key === 'home')?.hotspots[0],
      ).toMatchObject({
        target: 'cart',
        transition: 'modal',
      });

      // A hotspot whose target has been deleted is not served.
      await screens.softDelete(cart.id as string, actor);
      const after = await moduleRef
        .get(ContentService)
        .getPrototype(project.projectKey);
      expect(
        after.screens.find((entry) => entry.key === 'home')?.hotspots,
      ).toHaveLength(0);

      const work = await moduleRef.get(ContentService).getWork();
      expect(
        work.projects.find((entry) => entry.id === project.projectKey)
          ?.prototypeScreenCount,
      ).toBe(1);
    });
  });

  describe('collection engine', () => {
    it('refuses unknown fields, stale edits, and bad values', async () => {
      const testimonials = collection(testimonialSpec);

      await expect(
        testimonials.create(
          {
            position: 0,
            quote: 'q',
            name: 'n',
            role: 'r',
            company: 'c',
            extra: 1,
          },
          actor,
        ),
      ).rejects.toThrow('property extra should not exist');

      await expect(
        testimonials.create(
          {
            position: 0,
            quote: 'q',
            name: 'n',
            role: 'r',
            company: 'c',
            avatarUrl: 'javascript:alert(1)',
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      const created = await testimonials.create(
        {
          position: 0,
          quote: 'They shipped in six weeks.',
          name: 'Hana',
          role: 'COO',
          company: 'Acme',
        },
        actor,
      );
      expect(created.featured).toBe(true);

      await expect(
        testimonials.update(
          created.id as string,
          { name: 'Hana T.', expectedUpdatedAt: '2000-01-01T00:00:00.000Z' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      await testimonials.softDelete(created.id as string, actor);
      const active = await testimonials.list({ status: 'active' });
      expect(active.items).toHaveLength(0);
      await testimonials.restore(created.id as string, actor);
      expect(
        (await testimonials.list({ search: 'six weeks' })).items,
      ).toHaveLength(1);

      const logged = await prisma.adminAuditLog.count({
        where: { resource: 'testimonial' },
      });
      expect(logged).toBe(3);
    });
  });

  describe('site copy', () => {
    it('saves a page of values and overlays them on the catalogue', async () => {
      await collection(siteCopySpec).create(
        {
          key: 'home.work.title',
          page: 'home',
          section: 'work',
          label: 'Title',
          value: 'Open one.',
        },
        actor,
      );
      const controller = new AdminSiteCopyValuesController(prisma, audit);
      const request = { ip: '127.0.0.1', headers: {} };

      await expect(
        controller.saveValues(
          { values: { 'home.unknown': 'x' } },
          actor,
          request,
        ),
      ).rejects.toThrow('Unknown keys');

      const saved = await controller.saveValues(
        { values: { 'home.work.title': 'Tap through every app.' } },
        actor,
        request,
      );
      expect(saved.updated).toEqual(['home.work.title']);

      const copy = await moduleRef.get(ContentService).getCopy();
      expect(copy['home.work.title']).toBe('Tap through every app.');
      // Keys not in the database still come from the catalogue.
      expect(copy['home.work.all']).toBe('All work');
    });
  });

  describe('enquiries', () => {
    it('stores attribution, normalised', async () => {
      const receipt = await moduleRef.get(InquiriesService).submit(
        {
          name: 'Dawit Bekele',
          email: 'Dawit@Example.com',
          projectType: 'Mobile app',
          budget: 'Not sure yet',
          message: 'We need a delivery app for our shops.',
          utmSource: 'TikTok',
          referrer: 'javascript:alert(1)',
          landingPath: '/work/delivery-app',
          timeline: 'Within a month',
        },
        { ipAddress: '10.0.0.1' },
      );

      const stored = await prisma.inquiry.findUniqueOrThrow({
        where: { reference: receipt.reference },
      });
      expect(stored.email).toBe('dawit@example.com');
      expect(stored.utmSource).toBe('tiktok');
      expect(stored.referrer).toBeNull();
      expect(stored.landingPath).toBe('/work/delivery-app');
      expect(stored.timeline).toBe('Within a month');
    });
  });

  describe('dashboard overview', () => {
    it('counts new enquiries, groups their sources and lists what is missing', async () => {
      const overview = await moduleRef.get(AdminOverviewService).get();

      // The enquiry stored by the enquiries test above came from TikTok.
      expect(overview.enquiries.new).toBeGreaterThanOrEqual(1);
      expect(overview.enquiries.bySource).toEqual(
        expect.arrayContaining([expect.objectContaining({ source: 'tiktok' })]),
      );
      expect(overview.enquiries.weekly).toHaveLength(8);
      expect(overview.enquiries.weekly.at(-1)?.count).toBeGreaterThanOrEqual(1);
      expect(overview.projects.published).toBeGreaterThanOrEqual(1);
      // Projects created in this suite have no story written.
      expect(overview.projects.withoutStory.length).toBeGreaterThan(0);
    });
  });

  describe('backup and restore', () => {
    it('keeps tables the file lacks and never removes an enquiry', async () => {
      const before = await takeSnapshot(prisma);
      const mediaProject = await prisma.workProject.findFirstOrThrow({
        where: { deletedAt: null },
      });
      await prisma.workProjectMedia.create({
        data: {
          projectKey: mediaProject.projectKey,
          position: 0,
          url: '/shot.png',
        },
      });

      // An old-style file: projects, but nothing about screenshots or enquiries.
      const oldFile = {
        generatedAt: before.generatedAt,
        tables: { workProject: before.tables.workProject },
      };
      const current = await takeSnapshot(prisma);
      const summary = await restoreSnapshot(prisma, oldFile, current);

      expect(summary.kept).toContain('workProjectMedia');
      expect(await prisma.workProjectMedia.count()).toBe(1);
      expect(await prisma.inquiry.count()).toBe(current.tables.inquiry.length);
      expect(await prisma.siteCopy.count()).toBe(
        current.tables.siteCopy.length,
      );
    });
  });
});
