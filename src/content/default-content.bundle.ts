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
      'Enquiries are sent straight to the studio and held in our own system. Nothing is passed to a third-party form service, a mailing list, or an ad platform.',
    heroHeadline: 'Built once, properly',
    positionTitle: 'Most of the value is in deciding what not to build.',
    positionBody:
      'Anyone can add. The judgement worth paying for is subtraction — knowing which half of a roadmap will still be carrying weight in three years, and which half is going to be quietly deleted.',
  },
  primaryNavigation: [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/work', label: 'Work' },
    { to: '/about', label: 'About' },
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
    // Invented work is worse than no work: if the database cannot be read,
    // the site says nothing rather than something untrue.
    featuredProjects: [],
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
    projects: [],
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
      surface: string;
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
      surface: string;
      liveUrl: string;
      appStoreUrl: string;
      playStoreUrl: string;
      demoUrl: string;
      metricValue: string;
      metricLabel: string;
      stack: ReadonlyArray<string>;
      gallery: ReadonlyArray<{ url: string; kind: string; caption: string }>;
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
