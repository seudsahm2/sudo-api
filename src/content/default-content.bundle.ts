export const defaultContentBundle = {
  siteConfig: {
    name: 'Sudo Tech Labs',
    shortName: 'Sudo',
    descriptor: 'Engineering and design practice',
    defaultTitle: 'Engineering and design practice',
    description:
      'Sudo Tech Labs is an engineering-led studio building high-performance web, brand, AI, and motion systems.',
    contactEmail: 'root@sudotechlabs.com',
    responseWindow: 'Within one business day',
    statusLabel: 'Accepting new projects',
    intakeMode:
      'Your brief is prepared here and sent from your own email app, so nothing is stored on our servers before you press send.',
    heroHeadline: 'Built once, properly',
    positionTitle: 'Most of the value is in deciding what not to build.',
    positionBody:
      'Anyone can add. The judgement worth paying for is subtraction — knowing which half of a roadmap will still be carrying weight in three years, and which half is going to be quietly deleted.',
  },
  primaryNavigation: [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/work', label: 'Work' },
    { to: '/studio', label: 'Studio' },
  ],
  inquiryOptions: {
    projectTypes: [
      { value: 'web', label: 'Web platform' },
      { value: 'design', label: 'Brand system' },
      { value: 'ai', label: 'Applied AI' },
      { value: 'video', label: 'Film and motion' },
      { value: 'full', label: 'Full engagement' },
    ],
    budgetRanges: [
      { value: 'under_25k', label: 'Under $25k' },
      { value: '25k_50k', label: '$25k–50k' },
      { value: '50k_100k', label: '$50k–100k' },
      { value: '100k_250k', label: '$100k–250k' },
      { value: '250k_plus', label: '$250k+' },
    ],
  },
  home: {
    manifesto: [
      {
        icon: 'code',
        kicker: '01 / structure',
        title: 'Code is the skeleton',
        copy: 'Engineered architectures with type-safe rigor, edge performance, and observable systems.',
      },
      {
        icon: 'palette',
        kicker: '02 / surface',
        title: 'Design is the skin',
        copy: 'Identity systems and interfaces that feel sharp, geometric, and deliberate.',
      },
      {
        icon: 'brain',
        kicker: '03 / intelligence',
        title: 'AI is the brain',
        copy: 'Reasoning models, agent workflows, and automation pipelines built into the product.',
      },
    ],
    ecosystemTags: ['Web', 'Design', 'AI', 'Video'],
    featuredProjects: [
      {
        id: 'north-shield',
        tag: 'North Shield',
        title: 'Sovereign Banking Platform',
        discipline: ['Web', 'Design', 'AI'],
        year: '2026',
        summary:
          'End-to-end platform redesign and an agent layer for a sovereign-tier banking client.',
        coverImageUrl: '',
      },
      {
        id: 'orbital-labs',
        tag: 'Orbital Labs',
        title: 'Aerospace Identity System',
        discipline: ['Design', 'Video'],
        year: '2025',
        summary:
          'Identity system, brand film, and photography direction for an aerospace startup.',
        coverImageUrl: '',
      },
      {
        id: 'cipher-os',
        tag: 'Cipher OS',
        title: 'Agentic Workflow Engine',
        discipline: ['AI', 'Web'],
        year: '2026',
        summary:
          'Agent runtime, evaluation pipeline, and operator console for a no-code AI platform.',
        coverImageUrl: '',
      },
    ],
    stats: [
      { label: 'Projects delivered', value: 142 },
      { label: 'Clients supported', value: 38 },
      { label: 'Uptime', value: 99, suffix: '.98%' },
      { label: 'Engineers', value: 24 },
    ],
  },
  services: {
    services: [
      {
        icon: 'code',
        name: 'Web Development',
        handle: 'service/web',
        summary:
          'Edge-rendered platforms, design systems, and APIs built with type-safe rigor.',
        capabilities: [
          'Marketing and product platforms',
          'Internal tools and dashboards',
          'API and integration layers',
          'Performance and SEO engineering',
        ],
        stack: [
          'TypeScript',
          'React',
          'TanStack',
          'Rust',
          'Postgres',
          'Edge Workers',
        ],
        interconnects: ['design', 'ai'],
      },
      {
        icon: 'palette',
        name: 'Brand Design',
        handle: 'service/design',
        summary:
          'Identity systems and interface direction that operate as precision instruments.',
        capabilities: [
          'Brand identity and guidelines',
          'Product UI and UX systems',
          'Editorial and campaign design',
          'Print and packaging',
        ],
        stack: ['Figma', 'After Effects', 'Blender', 'Photoshop'],
        interconnects: ['web', 'video'],
      },
      {
        icon: 'brain',
        name: 'AI Integration',
        handle: 'service/ai',
        summary:
          'Agents, retrieval pipelines, and intelligence layers woven directly into product flows.',
        capabilities: [
          'Conversational and agentic UX',
          'Retrieval and vector pipelines',
          'Evaluation and observability',
          'Custom model orchestration',
        ],
        stack: [
          'OpenAI',
          'Anthropic',
          'Vector databases',
          'LangGraph',
          'WebAssembly',
        ],
        interconnects: ['web', 'design'],
      },
      {
        icon: 'film',
        name: 'Motion Production',
        handle: 'service/video',
        summary:
          'Brand films, product cinematics, and motion systems directed end to end.',
        capabilities: [
          'Brand and product films',
          '3D and motion design',
          'Animated explainers',
          'Live-action direction',
        ],
        stack: ['ARRI', 'Unreal', 'After Effects', 'DaVinci Resolve'],
        interconnects: ['design', 'ai'],
      },
    ],
    pipeline: [
      { icon: 'search', label: 'Discover', step: '01' },
      { icon: 'layers', label: 'Architect', step: '02' },
      { icon: 'git-branch', label: 'Build', step: '03' },
      { icon: 'rocket', label: 'Deploy', step: '04' },
      { icon: 'cpu', label: 'Iterate', step: '05' },
    ],
  },
  work: {
    filters: ['All', 'Web', 'Design', 'AI', 'Video'],
    projects: [
      {
        id: 'north-shield',
        title: 'Sovereign banking platform',
        client: 'North Shield',
        year: '2026',
        discipline: ['Web', 'Design', 'AI'],
        summary:
          'End-to-end platform redesign and AI agent layer for a sovereign-tier banking client.',
        coverImageUrl: '',
        challenge: '',
        approach: '',
        outcome: '',
      },
      {
        id: 'orbital-labs',
        title: 'Aerospace identity system',
        client: 'Orbital Labs',
        year: '2025',
        discipline: ['Design', 'Video'],
        summary:
          'Identity system, brand film, and product photography for an aerospace startup.',
        coverImageUrl: '',
        challenge: '',
        approach: '',
        outcome: '',
      },
      {
        id: 'cipher-os',
        title: 'Agentic workflow engine',
        client: 'Cipher OS',
        year: '2026',
        discipline: ['AI', 'Web'],
        summary:
          'Agent runtime, evaluation pipeline, and operator console for a no-code AI platform.',
        coverImageUrl: '',
        challenge: '',
        approach: '',
        outcome: '',
      },
      {
        id: 'atlas-foundry',
        title: 'Manufacturing operations platform',
        client: 'Atlas Foundry',
        year: '2025',
        discipline: ['Web', 'AI'],
        summary:
          'Real-time floor analytics, predictive QA models, and an operator dashboard suite.',
        coverImageUrl: '',
        challenge: '',
        approach: '',
        outcome: '',
      },
      {
        id: 'void-records',
        title: 'Label identity and packaging',
        client: 'Void Records',
        year: '2024',
        discipline: ['Design', 'Video'],
        summary:
          'Identity, packaging, and motion system for an experimental electronic label.',
        coverImageUrl: '',
        challenge: '',
        approach: '',
        outcome: '',
      },
      {
        id: 'helix-md',
        title: 'Clinical intelligence layer',
        client: 'Helix MD',
        year: '2026',
        discipline: ['AI', 'Design'],
        summary:
          'Clinician-facing summarization layer with provenance and citation guarantees.',
        coverImageUrl: '',
        challenge: '',
        approach: '',
        outcome: '',
      },
    ],
  },
  lab: {
    principles: [
      {
        icon: 'crosshair',
        name: 'Precision',
        desc: 'Tolerances are tight. Every pixel, byte, and millisecond is intentional.',
      },
      {
        icon: 'atom',
        name: 'Authority',
        desc: 'We operate at root. Decisions are made with confidence and accountability.',
      },
      {
        icon: 'beaker',
        name: 'Experimentation',
        desc: 'We run hypotheses, not opinions. Prototypes ship; theories get tested.',
      },
      {
        icon: 'hammer',
        name: 'Craft',
        desc: 'Engineering and design are the same discipline. Both apply taste to constraints.',
      },
    ],
    matrix: [
      ['Frontend', 'React, TanStack, Vite, TypeScript, Tailwind'],
      ['Backend', 'Node, Rust, Go, Postgres, Redis'],
      ['Edge', 'Cloudflare Workers and Durable Objects'],
      ['Intelligence', 'Anthropic, OpenAI, LangGraph, vector databases'],
      ['Design', 'Figma, Blender, After Effects, Cinema 4D'],
      ['Motion', 'Lottie, GSAP, Framer, WebGL shaders'],
    ],
    labSpecs: [
      ['Founded', '2022, independent'],
      ['Engineers', '24, across six time zones'],
      ['Headquarters', 'Remote, with people in New York, Berlin and Singapore'],
      ['Languages', 'English, German, French, Japanese, Portuguese'],
      ['Clients served', '38, from seed stage to public'],
      ['Projects delivered', '142, at 99.98% uptime'],
    ],
  },
} as const;

export type ContentBundle = {
  siteConfig: {
    name: string;
    shortName: string;
    descriptor: string;
    defaultTitle: string;
    description: string;
    contactEmail: string;
    responseWindow: string;
    statusLabel: string;
    intakeMode: string;
    heroHeadline: string;
    positionTitle: string;
    positionBody: string;
  };
  primaryNavigation: ReadonlyArray<{
    to: string;
    label: string;
  }>;
  inquiryOptions: {
    projectTypes: ReadonlyArray<{
      value: string;
      label: string;
    }>;
    budgetRanges: ReadonlyArray<{
      value: string;
      label: string;
    }>;
  };
  home: {
    manifesto: ReadonlyArray<{
      icon: string;
      kicker: string;
      title: string;
      copy: string;
    }>;
    ecosystemTags: ReadonlyArray<string>;
    featuredProjects: ReadonlyArray<{
      id: string;
      tag: string;
      title: string;
      discipline: ReadonlyArray<string>;
      year: string;
      summary: string;
      coverImageUrl: string;
    }>;
    stats: ReadonlyArray<{
      label: string;
      value: number;
      suffix?: string;
    }>;
  };
  services: {
    services: ReadonlyArray<{
      icon: string;
      name: string;
      handle: string;
      summary: string;
      capabilities: ReadonlyArray<string>;
      stack: ReadonlyArray<string>;
      interconnects: ReadonlyArray<string>;
    }>;
    pipeline: ReadonlyArray<{
      icon: string;
      label: string;
      step: string;
    }>;
  };
  work: {
    filters: ReadonlyArray<string>;
    projects: ReadonlyArray<{
      id: string;
      title: string;
      client: string;
      year: string;
      discipline: ReadonlyArray<string>;
      summary: string;
      coverImageUrl: string;
      challenge: string;
      approach: string;
      outcome: string;
    }>;
  };
  lab: {
    principles: ReadonlyArray<{
      icon: string;
      name: string;
      desc: string;
    }>;
    matrix: ReadonlyArray<ReadonlyArray<string>>;
    labSpecs: ReadonlyArray<ReadonlyArray<string>>;
  };
};
