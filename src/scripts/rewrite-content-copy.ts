/**
 * One-off content rewrite: turns the terminal-era handles stored in the CMS
 * into text a reader should actually see.
 *
 * Safe to run more than once. Every statement matches on the old value, so a
 * second run changes nothing, and anything already edited by hand is left
 * alone. Nothing is deleted.
 *
 *   npx ts-node --transpile-only src/scripts/rewrite-content-copy.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Discipline and filter values must stay in lockstep or filtering breaks. */
const TAXONOMY: Record<string, string> = {
  all: 'All',
  web: 'Web',
  design: 'Design',
  ai: 'AI',
  video: 'Video',
  'video editing': 'Video editing',
};

const NAV: Record<string, string> = {
  home: 'Home',
  services: 'Services',
  work: 'Work',
  studio: 'Studio',
  lab: 'Studio',
  contact: 'Contact',
};

const PROJECT_TYPES: Record<string, string> = {
  web_development: 'Web platform',
  brand_design: 'Brand system',
  ai_integration: 'Applied AI',
  video_production: 'Film and motion',
  full_stack_engagement: 'Full engagement',
};

const BUDGETS: Record<string, string> = {
  under_25k_usd: 'Under $25k',
  '25k_to_50k_usd': '$25k–50k',
  '50k_to_100k_usd': '$50k–100k',
  '100k_to_250k_usd': '$100k–250k',
  '250k_plus_usd': '$250k+',
};

const STATS: Record<string, string> = {
  projects_deployed: 'Projects delivered',
  clients_supported: 'Clients supported',
  uptime_percent: 'Uptime',
  lab_engineers: 'Engineers',
};

const MATRIX: Record<string, [string, string]> = {
  frontend: ['Frontend', 'React, TanStack, Vite, TypeScript, Tailwind'],
  backend: ['Backend', 'Node, Rust, Go, Postgres, Redis'],
  edge: ['Edge', 'Cloudflare Workers and Durable Objects'],
  ai: ['Intelligence', 'Anthropic, OpenAI, LangGraph, vector databases'],
  design: ['Design', 'Figma, Blender, After Effects, Cinema 4D'],
  motion: ['Motion', 'Lottie, GSAP, Framer, WebGL shaders'],
};

/** Tool names as their makers write them. */
const STACK: Record<string, string> = {
  typescript: 'TypeScript',
  react: 'React',
  tanstack: 'TanStack',
  rust: 'Rust',
  postgres: 'Postgres',
  edge_workers: 'Edge Workers',
  figma: 'Figma',
  after_effects: 'After Effects',
  blender: 'Blender',
  photoshop: 'Photoshop',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  vector_db: 'Vector databases',
  langgraph: 'LangGraph',
  wasm: 'WebAssembly',
  arri: 'ARRI',
  unreal: 'Unreal',
  davinci: 'DaVinci Resolve',
  cinema4d: 'Cinema 4D',
  lottie: 'Lottie',
  gsap: 'GSAP',
  framer: 'Framer',
};

const SPECS: Record<string, [string, string]> = {
  founded: ['Founded', '2022, independent'],
  engineers: ['Engineers', '24, across six time zones'],
  headquarters: [
    'Headquarters',
    'Remote, with people in New York, Berlin and Singapore',
  ],
  languages: ['Languages', 'English, German, French, Japanese, Portuguese'],
  clients_served: ['Clients served', '38, from seed stage to public'],
  projects_deployed: ['Projects delivered', '142, at 99.98% uptime'],
};

/** "client/north-shield" -> "North Shield"; "Cipher Os" -> "Cipher OS". */
function readableClient(value: string): string {
  const stripped = value
    .replace(/^client\//i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  return stripped
    .split(/\s+/)
    .map((word) =>
      /^(os|md|ai|ui|ux|api)$/i.test(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

let changes = 0;
function note(what: string, from: string, to: string) {
  if (from === to) return;
  changes += 1;
  console.log(`  ${what}: ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
}

async function main() {
  console.log('Rewriting stored content into plain English.\n');

  console.log('Site config');
  const site = await prisma.siteConfig.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (site) {
    const next = {
      shortName: site.shortName === 'SUDO' ? 'Sudo' : site.shortName,
      descriptor: /^[a-z_]+$/.test(site.descriptor)
        ? 'Engineering and design practice'
        : site.descriptor,
      defaultTitle: /root access/i.test(site.defaultTitle)
        ? 'Engineering and design practice'
        : site.defaultTitle,
      statusLabel: /[_]/.test(site.statusLabel)
        ? 'Accepting new projects'
        : site.statusLabel,
      responseWindow:
        site.responseWindow === 'Within 1 business day'
          ? 'Within one business day'
          : site.responseWindow,
      intakeMode: /^static intake mode/i.test(site.intakeMode)
        ? 'Your brief is prepared here and sent from your own email app, so nothing is stored on our servers before you press send.'
        : site.intakeMode,
      positionBody:
        site.positionBody.trim().length === 0
          ? 'Anyone can add. The judgement worth paying for is subtraction — knowing which half of a roadmap will still be carrying weight in three years, and which half is going to be quietly deleted.'
          : site.positionBody,
    };
    for (const [key, value] of Object.entries(next)) {
      note(key, String(site[key as keyof typeof site]), value);
    }
    await prisma.siteConfig.update({ where: { id: site.id }, data: next });
  }

  console.log('\nNavigation');
  for (const item of await prisma.primaryNavigation.findMany()) {
    const label = NAV[item.label.toLowerCase()] ?? item.label;
    if (label !== item.label) {
      note('nav', item.label, label);
      await prisma.primaryNavigation.update({
        where: { id: item.id },
        data: { label },
      });
    }
  }

  console.log('\nInquiry options');
  for (const item of await prisma.inquiryProjectType.findMany()) {
    const label = PROJECT_TYPES[item.label] ?? item.label;
    if (label !== item.label) {
      note('projectType', item.label, label);
      await prisma.inquiryProjectType.update({
        where: { id: item.id },
        data: { label },
      });
    }
  }
  for (const item of await prisma.inquiryBudgetRange.findMany()) {
    const label = BUDGETS[item.label] ?? item.label;
    if (label !== item.label) {
      note('budget', item.label, label);
      await prisma.inquiryBudgetRange.update({
        where: { id: item.id },
        data: { label },
      });
    }
  }

  console.log('\nHome');
  for (const item of await prisma.homeStat.findMany()) {
    const label = STATS[item.label] ?? item.label;
    if (label !== item.label) {
      note('stat', item.label, label);
      await prisma.homeStat.update({ where: { id: item.id }, data: { label } });
    }
  }
  for (const item of await prisma.homeEcosystemTag.findMany()) {
    const tag = TAXONOMY[item.tag.toLowerCase()] ?? item.tag;
    if (tag !== item.tag) {
      note('ecosystemTag', item.tag, tag);
      await prisma.homeEcosystemTag.update({
        where: { id: item.id },
        data: { tag },
      });
    }
  }

  console.log('\nServices');
  for (const item of await prisma.serviceStackItem.findMany()) {
    const value = STACK[item.value.toLowerCase()] ?? item.value;
    if (value !== item.value) {
      note('stack', item.value, value);
      await prisma.serviceStackItem.update({
        where: { id: item.id },
        data: { value },
      });
    }
  }

  console.log('\nWork');
  for (const item of await prisma.workFilter.findMany()) {
    const value = TAXONOMY[item.value.toLowerCase()] ?? item.value;
    if (value !== item.value) {
      note('filter', item.value, value);
      await prisma.workFilter.update({
        where: { id: item.id },
        data: { value },
      });
    }
  }
  for (const item of await prisma.workProject.findMany()) {
    const client = readableClient(item.client);
    if (client !== item.client) {
      note('project.client', item.client, client);
      await prisma.workProject.update({
        where: { id: item.id },
        data: { client },
      });
    }
  }
  for (const item of await prisma.workProjectDiscipline.findMany()) {
    const value = TAXONOMY[item.value.toLowerCase()] ?? item.value;
    if (value !== item.value) {
      note('project.discipline', item.value, value);
      await prisma.workProjectDiscipline.update({
        where: { id: item.id },
        data: { value },
      });
    }
  }

  console.log('\nStudio');
  for (const item of await prisma.labMatrixRow.findMany()) {
    const mapped = MATRIX[item.label.toLowerCase()];
    if (mapped && (mapped[0] !== item.label || mapped[1] !== item.value)) {
      note(
        'matrix',
        `${item.label} / ${item.value}`,
        `${mapped[0]} / ${mapped[1]}`,
      );
      await prisma.labMatrixRow.update({
        where: { id: item.id },
        data: { label: mapped[0], value: mapped[1] },
      });
    }
  }
  for (const item of await prisma.labSpec.findMany()) {
    const mapped = SPECS[item.label.toLowerCase()];
    if (mapped && (mapped[0] !== item.label || mapped[1] !== item.value)) {
      note(
        'spec',
        `${item.label} / ${item.value}`,
        `${mapped[0]} / ${mapped[1]}`,
      );
      await prisma.labSpec.update({
        where: { id: item.id },
        data: { label: mapped[0], value: mapped[1] },
      });
    }
  }

  console.log(`\n${changes} value(s) rewritten.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
