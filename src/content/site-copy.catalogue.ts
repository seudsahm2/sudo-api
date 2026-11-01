/**
 * Every piece of fixed wording on the public site, with the words it ships
 * with.
 *
 * This list is the source of truth for three things:
 *   - the `content:copy-backfill` script, which inserts any key the database
 *     does not have yet (and never touches one that has been edited);
 *   - the fallback bundle, served when the database cannot be read;
 *   - the site's own defaults, exported to `sudo-hq` by the same script.
 *
 * Keys are `page.section.name`. The page and section are read off the key, so
 * the admin can group the editor the way the page is laid out.
 *
 * Conventions in values:
 *   - A line break splits a headline into the lines that rise in one by one.
 *   - `{name}` is filled in by the page: `{client}`, `{year}`, `{count}`,
 *     `{responseWindow}`, `{title}`. The help text says which ones a key takes.
 */

export type SiteCopyKind = 'text' | 'longtext' | 'url';

export interface SiteCopyEntry {
  key: string;
  label: string;
  value: string;
  kind?: SiteCopyKind;
  helpText?: string;
}

const HEADLINE_HELP = 'Each line break starts a new line of the headline.';

export const SITE_COPY_CATALOGUE: SiteCopyEntry[] = [
  // ------------------------------------------------------------- global
  {
    key: 'global.header.cta',
    label: 'Header button',
    value: 'Request a proposal',
  },
  {
    key: 'global.header.menu-open',
    label: 'Menu button (closed), for screen readers',
    value: 'Open menu',
  },
  {
    key: 'global.header.menu-close',
    label: 'Menu button (open), for screen readers',
    value: 'Close menu',
  },
  {
    key: 'global.header.mobile-cta',
    label: 'Button at the bottom of the phone menu',
    value: 'Request a proposal',
  },
  {
    key: 'global.header.home-label',
    label: 'Logo link, for screen readers',
    value: '{name}, home',
    helpText: 'Takes {name}, the company name.',
  },
  {
    key: 'global.a11y.skip',
    label: 'Skip-to-content link for keyboard users',
    value: 'Skip to content',
  },

  {
    key: 'global.footer.pages-heading',
    label: 'Footer links heading',
    value: 'Pages',
  },
  {
    key: 'global.footer.contact-link',
    label: 'Footer contact link',
    value: 'Contact',
  },
  {
    key: 'global.footer.business-heading',
    label: 'Footer email heading',
    value: 'New business',
  },
  {
    key: 'global.footer.business-note',
    label: 'Line under the footer email',
    value: 'Read by a partner, answered within one business day.',
  },
  {
    key: 'global.footer.admin-link',
    label: 'Admin link in the footer',
    value: 'Admin',
  },

  {
    key: 'global.form.name-label',
    label: 'Name field label',
    value: 'Your name',
  },
  {
    key: 'global.form.name-placeholder',
    label: 'Name field example',
    value: 'Dawit Bekele',
  },
  {
    key: 'global.form.email-label',
    label: 'Email field label',
    value: 'Email',
  },
  {
    key: 'global.form.email-placeholder',
    label: 'Email field example',
    value: 'you@company.com',
  },
  {
    key: 'global.form.type-legend',
    label: 'Project type question',
    value: 'What do you need?',
  },
  {
    key: 'global.form.budget-legend',
    label: 'Budget question',
    value: 'Budget',
  },
  {
    key: 'global.form.budget-undecided',
    label: 'Budget choice for people who have not decided',
    value: 'Not sure yet',
  },
  {
    key: 'global.form.message-label',
    label: 'Message field label',
    value: 'What are you building?',
  },
  {
    key: 'global.form.message-placeholder',
    label: 'Message field example',
    value:
      'A sentence is enough to start. What it is, who it is for, and when you need it.',
    kind: 'longtext',
  },
  {
    key: 'global.form.company-label',
    label: 'Company field label',
    value: 'Company',
  },
  {
    key: 'global.form.optional',
    label: 'Marker for optional fields',
    value: '(optional)',
  },
  { key: 'global.form.submit', label: 'Send button', value: 'Send it' },
  {
    key: 'global.form.sending',
    label: 'Send button while sending',
    value: 'Sending…',
  },
  {
    key: 'global.form.sending-note',
    label: 'Note beside the button while sending',
    value: 'One moment.',
  },
  {
    key: 'global.form.note',
    label: 'Note beside the send button',
    value: '{responseWindow}. No forms after this one.',
    helpText: 'Takes {responseWindow} from site settings.',
  },
  {
    key: 'global.form.error-name',
    label: 'Error: name missing',
    value: 'Add your name, so we know who we are replying to.',
  },
  {
    key: 'global.form.error-email',
    label: 'Error: email wrong',
    value: 'That email address does not look right. Check it and try again.',
  },
  {
    key: 'global.form.error-message',
    label: 'Error: message too short',
    value: 'Tell us a little about the work — a sentence or two is plenty.',
  },
  {
    key: 'global.form.error-network',
    label: 'Error: could not send',
    value: 'We could not send that just now. Try again, or email us directly.',
  },
  {
    key: 'global.form.receipt-label',
    label: 'Receipt: small heading',
    value: 'Received',
  },
  {
    key: 'global.form.receipt-title',
    label: 'Receipt: headline',
    value: 'That is with us. Nothing else to do.',
  },
  {
    key: 'global.form.receipt-before',
    label: 'Receipt: text before the reference',
    value:
      '{responseWindow}, from a person rather than an autoresponder. Your reference is',
    helpText: 'Takes {responseWindow}. The reference number follows this text.',
  },
  {
    key: 'global.form.receipt-after',
    label: 'Receipt: text after the reference',
    value: '— quote it if you write again.',
  },
  {
    key: 'global.form.send-another',
    label: 'Receipt: send another button',
    value: 'Send another',
  },

  {
    key: 'global.project.preview',
    label: 'Button that opens a project preview',
    value: 'Preview it',
  },
  {
    key: 'global.project.preview-label',
    label: 'Preview button, for screen readers',
    value: 'Preview {title}',
    helpText: "Takes {title}, the project's title.",
  },
  {
    key: 'global.project.case-study',
    label: 'Link to a case study',
    value: 'Case study',
  },
  {
    key: 'global.project.live-site',
    label: 'Link to the live website',
    value: 'Live site',
  },
  {
    key: 'global.project.open-live',
    label: 'Preview: link to the live website',
    value: 'Open the live site',
  },
  {
    key: 'global.project.app-store',
    label: 'Link to the App Store',
    value: 'App Store',
  },
  {
    key: 'global.project.play-store',
    label: 'Link to Google Play',
    value: 'Google Play',
  },
  {
    key: 'global.project.read-case-study',
    label: 'Preview: case study link',
    value: 'Read the case study',
  },
  {
    key: 'global.project.request',
    label: 'Preview: proposal button',
    value: 'Request a proposal',
  },
  {
    key: 'global.project.built-with',
    label: 'Heading over the technology list',
    value: 'Built with',
  },
  {
    key: 'global.project.disciplines',
    label: 'Heading over the disciplines',
    value: 'Disciplines',
  },
  {
    key: 'global.project.close',
    label: 'Preview: close button',
    value: 'Close',
  },
  {
    key: 'global.project.previous',
    label: 'Previous button',
    value: 'Previous',
  },
  { key: 'global.project.next', label: 'Next button', value: 'Next' },
  {
    key: 'global.project.view-screens',
    label: 'Preview: screenshots tab',
    value: 'Screens',
  },
  {
    key: 'global.project.view-app',
    label: 'Preview: run-the-app tab',
    value: 'Run the app',
  },
  {
    key: 'global.project.view-site',
    label: 'Preview: live-site tab',
    value: 'Live site',
  },

  {
    key: 'global.live.app-prompt',
    label: 'Live app: text before it starts',
    value: 'Run the app here and tap through it.',
  },
  {
    key: 'global.live.site-prompt',
    label: 'Live site: text before it loads',
    value: 'Load the live site inside this window.',
  },
  {
    key: 'global.live.app-start',
    label: 'Live app: start button',
    value: 'Start the app',
  },
  {
    key: 'global.live.site-start',
    label: 'Live site: load button',
    value: 'Load the site',
  },
  {
    key: 'global.live.refused',
    label: 'Live view: shown when a site refuses to load inside the page',
    value:
      'This one refuses to run inside another page — a security header on its own server, not a fault here.',
    kind: 'longtext',
  },
  {
    key: 'global.live.open-tab',
    label: 'Live view: open in new tab',
    value: 'Open it in a new tab',
  },
  {
    key: 'global.live.starting',
    label: 'Live view: loading text',
    value: 'Starting {host}…',
    helpText: 'Takes {host}, the address being loaded.',
  },
  {
    key: 'global.live.running',
    label: 'Live view: shown once running',
    value: 'Running live.',
  },
  {
    key: 'global.live.app-hint',
    label: 'Live app: how to use it',
    value: 'Tap it as you would on a phone.',
  },
  {
    key: 'global.live.site-hint',
    label: 'Live site: how to use it',
    value: 'Scroll and click inside it.',
  },
  {
    key: 'global.live.open-full',
    label: 'Live view: open full size link',
    value: 'Open full size',
  },

  {
    key: 'global.not-found.label',
    label: '404: small heading',
    value: 'Not found',
  },
  {
    key: 'global.not-found.title',
    label: '404: headline',
    value: 'This page has moved, or never existed.',
  },
  {
    key: 'global.not-found.body',
    label: '404: text',
    value: 'Check the address, or start again from the overview.',
  },
  {
    key: 'global.not-found.cta',
    label: '404 and error: home link',
    value: 'Return to the overview',
  },
  {
    key: 'global.error.label',
    label: 'Error page: small heading',
    value: 'Error',
  },
  {
    key: 'global.error.title',
    label: 'Error page: headline',
    value: 'Something on this page failed to load.',
  },
  {
    key: 'global.error.body',
    label: 'Error page: text',
    value:
      'Retry the page. If it keeps failing, the detail below is what went wrong.',
  },
  {
    key: 'global.error.retry',
    label: 'Error page: retry button',
    value: 'Retry',
  },

  // --------------------------------------------------------------- home
  {
    key: 'home.meta.title',
    label: 'Browser tab title',
    value: 'Engineering and design practice',
  },
  {
    key: 'home.meta.description',
    label: 'Search engine description',
    value:
      'An engineering and design practice building mobile apps, web platforms, brand systems, and applied intelligence for companies that measure their work in years.',
    kind: 'longtext',
  },
  {
    key: 'home.meta.share-description',
    label: 'Description when the link is shared',
    value:
      'Mobile apps and web platforms, built once and built properly. See the work, then send one form.',
    kind: 'longtext',
  },

  {
    key: 'home.hero.primary-cta',
    label: 'Hero: main button',
    value: 'See the work',
  },
  {
    key: 'home.hero.secondary-cta',
    label: 'Hero: second button',
    value: 'Request a proposal',
  },

  {
    key: 'home.work.label',
    label: 'Selected work: small heading',
    value: 'Selected work',
  },
  {
    key: 'home.work.title',
    label: 'Selected work: headline',
    value: 'Open one. It is all on screen.',
  },
  {
    key: 'home.work.all',
    label: 'Selected work: link to all work',
    value: 'All work',
  },
  {
    key: 'home.work.previous',
    label: 'Carousel: previous button',
    value: 'Prev',
  },
  { key: 'home.work.next', label: 'Carousel: next button', value: 'Next' },
  { key: 'home.work.play', label: 'Carousel: play button', value: 'Play' },
  { key: 'home.work.pause', label: 'Carousel: pause button', value: 'Pause' },
  {
    key: 'home.work.previous-label',
    label: 'Carousel: previous button, for screen readers',
    value: 'Previous project',
  },
  {
    key: 'home.work.next-label',
    label: 'Carousel: next button, for screen readers',
    value: 'Next project',
  },
  {
    key: 'home.work.pause-label',
    label: 'Carousel: pause button, for screen readers',
    value: 'Pause the carousel',
  },
  {
    key: 'home.work.resume-label',
    label: 'Carousel: play button, for screen readers',
    value: 'Resume the carousel',
  },
  {
    key: 'home.work.show-label',
    label: 'Carousel: jump-to-project button, for screen readers',
    value: 'Show {title}',
    helpText: "Takes {title}, the project's title.",
  },

  {
    key: 'home.capabilities.label',
    label: 'Capabilities: small heading',
    value: 'Capabilities',
  },
  {
    key: 'home.capabilities.title',
    label: 'Capabilities: headline',
    value: 'Three disciplines,\none accountable team.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'home.capabilities.body',
    label: 'Capabilities: text',
    value:
      'You are not handed between agencies. The people who design it are the people who build it and the people who answer for it afterwards.',
    kind: 'longtext',
  },

  {
    key: 'home.figures.label',
    label: 'Numbers: small heading',
    value: 'By the numbers',
  },

  {
    key: 'home.engagement.label',
    label: 'Process: small heading',
    value: 'The engagement',
  },
  {
    key: 'home.engagement.title',
    label: 'Process: headline',
    value: 'No mystery\nin the middle.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'home.engagement.body',
    label: 'Process: text',
    value:
      'You see the work at every stage, and you own everything we produce at every stage. There is no point at which the project is only in our hands.',
    kind: 'longtext',
  },
  {
    key: 'home.engagement.stage',
    label: 'Process: stage label',
    value: 'Stage {step}',
    helpText: 'Takes {step}, the stage number.',
  },

  {
    key: 'home.position.label',
    label: 'Point of view: small heading',
    value: 'Point of view',
  },
  {
    key: 'home.position.image-alt',
    label: 'Point of view: image description',
    value:
      'The Sudo mark embossed on a brass medallion set into green leather.',
  },

  {
    key: 'home.proposal.label',
    label: 'Proposal: small heading',
    value: 'Request a proposal',
  },
  {
    key: 'home.proposal.title',
    label: 'Proposal: headline',
    value: 'Tell us what\nyou are building.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'home.proposal.step-1-title',
    label: 'Next step 1: title',
    value: 'It reaches a partner',
  },
  {
    key: 'home.proposal.step-1-body',
    label: 'Next step 1: text',
    value: 'Not a shared inbox, not an outsourced sales desk.',
  },
  {
    key: 'home.proposal.step-2-title',
    label: 'Next step 2: title',
    value: 'A reply inside a day',
  },
  {
    key: 'home.proposal.step-2-body',
    label: 'Next step 2: text',
    value: '{responseWindow}',
    helpText: 'Takes {responseWindow} from site settings.',
  },
  {
    key: 'home.proposal.step-3-title',
    label: 'Next step 3: title',
    value: 'A written point of view',
  },
  {
    key: 'home.proposal.step-3-body',
    label: 'Next step 3: text',
    value:
      'What we would build, and what we would not, before anyone asks you for a budget.',
  },

  // ----------------------------------------------------------- services
  { key: 'services.meta.title', label: 'Browser tab title', value: 'Services' },
  {
    key: 'services.meta.description',
    label: 'Search engine description',
    value:
      'Web platforms, brand systems and applied intelligence, run by one team, against one standard.',
    kind: 'longtext',
  },
  {
    key: 'services.meta.share-description',
    label: 'Description when the link is shared',
    value: 'Three disciplines, one team, one standard.',
  },
  {
    key: 'services.hero.label',
    label: 'Hero: small heading',
    value: 'Services',
  },
  {
    key: 'services.hero.title',
    label: 'Hero: headline',
    value: 'Three disciplines,\none standard.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'services.hero.body',
    label: 'Hero: text',
    value:
      'Engineering, identity and intelligence, run by one team with shared access to the whole product surface. Nothing is handed to a subcontractor and hoped for.',
    kind: 'longtext',
  },
  {
    key: 'services.hero.disciplines',
    label: 'Hero: disciplines count label',
    value: 'Disciplines',
  },
  {
    key: 'services.hero.vendors',
    label: 'Hero: vendors count label',
    value: 'Vendors',
  },
  {
    key: 'services.engagement.label',
    label: 'Process: small heading',
    value: 'The engagement',
  },
  {
    key: 'services.engagement.title',
    label: 'Process: headline',
    value: 'Every engagement\nmoves the same way.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'services.room.deliverables',
    label: 'Services: list heading inside each service',
    value: 'What you get',
  },
  {
    key: 'services.room.timeline',
    label: 'Services: timeline label',
    value: 'Timeline',
  },
  {
    key: 'services.room.from',
    label: 'Services: price label',
    value: 'Starting from',
  },
  {
    key: 'services.room.more',
    label: 'Services: link to the service landing page',
    value: 'How it works',
  },
  {
    key: 'services.models.label',
    label: 'Services: engagement models, small heading',
    value: 'How we work with you',
  },
  {
    key: 'services.models.title',
    label: 'Services: engagement models, headline',
    value: 'Three ways\nto start.',
  },
  {
    key: 'services.models.fit-label',
    label: 'Services: engagement models, "best for" label',
    value: 'Best for',
  },
  {
    key: 'services.models.sprint-name',
    label: 'Services: model 1 name',
    value: 'MVP sprint',
  },
  {
    key: 'services.models.sprint-body',
    label: 'Services: model 1 text',
    value:
      'A first version in front of real users in six to eight weeks. One focused scope, one launch date.',
  },
  {
    key: 'services.models.sprint-fit',
    label: 'Services: model 1 best for',
    value: 'A new product that needs proof before more investment.',
  },
  {
    key: 'services.models.fixed-name',
    label: 'Services: model 2 name',
    value: 'Fixed scope',
  },
  {
    key: 'services.models.fixed-body',
    label: 'Services: model 2 text',
    value:
      'A written scope, a fixed price and a fixed date. Changes are agreed in writing before they happen.',
  },
  {
    key: 'services.models.fixed-fit',
    label: 'Services: model 2 best for',
    value: 'A product you already know the shape of.',
  },
  {
    key: 'services.models.retainer-name',
    label: 'Services: model 3 name',
    value: 'Retainer',
  },
  {
    key: 'services.models.retainer-body',
    label: 'Services: model 3 text',
    value:
      'A monthly team that keeps improving the product after launch: new features, fixes and releases.',
  },
  {
    key: 'services.models.retainer-fit',
    label: 'Services: model 3 best for',
    value: 'A live product that has to keep moving.',
  },
  {
    key: 'services.faq.label',
    label: 'Services: questions, small heading',
    value: 'Questions',
  },
  {
    key: 'services.faq.title',
    label: 'Services: questions, headline',
    value: 'Before you ask.',
  },
  {
    key: 'services.close.whatsapp',
    label: 'Services: WhatsApp button in the closing section',
    value: 'Message us on WhatsApp',
  },
  {
    key: 'service.meta.fallback-description',
    label: 'Service page: description when the service has no summary',
    value: 'A service from Sudo Tech Labs.',
  },
  {
    key: 'service.hero.cta',
    label: 'Service page: hero button',
    value: 'Get a proposal',
  },
  {
    key: 'service.get.label',
    label: 'Service page: deliverables, small heading',
    value: 'What you get',
  },
  {
    key: 'service.get.title',
    label: 'Service page: deliverables, headline',
    value: 'Everything it takes\nto launch.',
  },
  {
    key: 'service.proof.label',
    label: 'Service page: work, small heading',
    value: 'Proof',
  },
  {
    key: 'service.proof.title',
    label: 'Service page: work, headline',
    value: 'Work like this,\nalready shipped.',
  },
  {
    key: 'service.process.label',
    label: 'Service page: process, small heading',
    value: 'How it runs',
  },
  {
    key: 'service.faq.label',
    label: 'Service page: questions, small heading',
    value: 'Questions',
  },
  {
    key: 'service.form.label',
    label: 'Service page: form, small heading',
    value: 'Get a proposal',
  },
  {
    key: 'service.form.title',
    label: 'Service page: form headline. {service} is the service name',
    value: 'Tell us about\nyour project.',
  },
  {
    key: 'service.form.body',
    label:
      'Service page: text beside the form. {responseWindow} is the reply time',
    value:
      '{responseWindow}. A written reply from a person, not a sales sequence.',
  },
  {
    key: 'services.close.label',
    label: 'Closing: small heading',
    value: 'Request a proposal',
  },
  {
    key: 'services.close.title',
    label: 'Closing: headline',
    value: 'Tell us which of\nthese you need.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'services.close.cta',
    label: 'Closing: button',
    value: 'Request a proposal',
  },

  // --------------------------------------------------------------- work
  { key: 'work.meta.title', label: 'Browser tab title', value: 'Showcase' },
  {
    key: 'work.meta.description',
    label: 'Search engine description',
    value:
      'Every product Sudo Tech Labs has shipped — mobile apps and web platforms — shown on screen, with live links and the results each one produced.',
    kind: 'longtext',
  },
  {
    key: 'work.meta.share-description',
    label: 'Description when the link is shared',
    value:
      'Mobile apps and web platforms, shown on screen rather than described.',
  },
  { key: 'work.hero.label', label: 'Hero: small heading', value: 'Showcase' },
  {
    key: 'work.hero.title',
    label: 'Hero: headline',
    value: 'Look at it, not at a list.',
  },
  {
    key: 'work.hero.body',
    label: 'Hero: text',
    value:
      'Every product below is on screen as it actually ships. Open one and move through it — and where a thing is live, the link goes straight to it.',
    kind: 'longtext',
  },
  {
    key: 'work.hero.count-total',
    label: 'Hero: total count label',
    value: 'Shipped',
  },
  {
    key: 'work.hero.count-web',
    label: 'Hero: website count label',
    value: 'Web platforms',
  },
  {
    key: 'work.hero.count-mobile',
    label: 'Hero: app count label',
    value: 'Mobile apps',
  },
  { key: 'work.filter.all', label: 'Filter: everything', value: 'Everything' },
  { key: 'work.filter.web', label: 'Filter: websites', value: 'Web platforms' },
  { key: 'work.filter.mobile', label: 'Filter: apps', value: 'Mobile apps' },
  {
    key: 'work.empty',
    label: 'Shown when a filter matches nothing',
    value: 'Nothing under that combination yet. Widen the filter.',
  },
  {
    key: 'work.hero.count-android',
    label: 'Work page: count label for Android apps',
    value: 'Android apps',
  },
  {
    key: 'work.hero.count-ios',
    label: 'Work page: count label for iPhone apps',
    value: 'iPhone apps',
  },
  {
    key: 'work.filter.android',
    label: 'Work page: Android filter',
    value: 'Android',
  },
  {
    key: 'work.filter.ios',
    label: 'Work page: iPhone filter',
    value: 'iPhone',
  },
  {
    key: 'work.view.spreads',
    label: 'Work page: view switch, large spreads',
    value: 'Spreads',
  },
  {
    key: 'work.view.list',
    label: 'Work page: view switch, list of names',
    value: 'List',
  },
  {
    key: 'work.badge.app',
    label: 'Work page: badge on a project whose real app runs on the site',
    value: 'Real app inside',
  },
  {
    key: 'work.badge.prototype',
    label: 'Work page: badge on a project with a tap-through prototype',
    value: 'Tap-through',
  },
  {
    key: 'work.index.label',
    label: 'Further work: small heading',
    value: 'Further work',
  },
  {
    key: 'work.close.label',
    label: 'Closing: small heading',
    value: 'Request a proposal',
  },
  {
    key: 'work.close.title',
    label: 'Closing: headline',
    value: 'Tell us what to build next.',
  },
  {
    key: 'work.close.body',
    label: 'Closing: text',
    value:
      'One form, one screen, one reply from a person. No discovery call required before anyone will talk to you about the actual work.',
    kind: 'longtext',
  },

  // ---------------------------------------------------------- case study
  {
    key: 'project.meta.fallback-description',
    label: 'Search description when a project has no summary',
    value: 'A case study from Sudo Tech Labs.',
  },
  {
    key: 'project.facts.disciplines',
    label: 'Facts: disciplines label',
    value: 'Disciplines',
  },
  {
    key: 'project.facts.built-with',
    label: 'Facts: technology label',
    value: 'Built with',
  },
  {
    key: 'project.facts.live-at',
    label: 'Facts: address label',
    value: 'Live at',
  },
  {
    key: 'project.story.challenge',
    label: 'Story: challenge heading',
    value: 'The challenge',
  },
  {
    key: 'project.story.approach',
    label: 'Story: approach heading',
    value: 'The approach',
  },
  {
    key: 'project.story.outcome',
    label: 'Story: outcome heading',
    value: 'The outcome',
  },
  {
    key: 'project.story.pending',
    label: 'Shown when the case study is not written yet',
    value:
      'The written case study for this project is in preparation. In the meantime, ask us about it directly — we can usually say more in a conversation than we can put in public.',
    kind: 'longtext',
  },
  {
    key: 'project.hero.try',
    label: 'Case study: hero button that jumps to the running app',
    value: 'Try it',
  },
  {
    key: 'project.facts.client',
    label: 'Case study facts bar: client',
    value: 'Client',
  },
  {
    key: 'project.facts.year',
    label: 'Case study facts bar: year',
    value: 'Year',
  },
  {
    key: 'project.facts.platforms',
    label: 'Case study facts bar: platforms',
    value: 'Platforms',
  },
  {
    key: 'project.facts.duration',
    label: 'Case study facts bar: how long it took',
    value: 'Timeline',
  },
  {
    key: 'project.highlights.label',
    label: 'Case study: highlights heading',
    value: 'Highlights',
  },
  {
    key: 'project.try.label',
    label: 'Case study: try-it section, small heading',
    value: 'Try it right here',
  },
  {
    key: 'project.try.title',
    label: 'Case study: try-it section, headline',
    value: 'Use it.\nRight here.',
  },
  {
    key: 'project.try.body-app',
    label: 'Case study: try-it text when the real app is uploaded',
    value:
      'This is the real app, running in your browser. Tap through it as you would on a phone.',
  },
  {
    key: 'project.try.body-prototype',
    label: 'Case study: try-it text for a tap-through prototype',
    value:
      "The app's real screens, linked the way the app moves. Tap the highlighted places to go through it.",
  },
  {
    key: 'project.try.body-site',
    label: 'Case study: try-it text for a live website',
    value:
      'The live site, inside this page. Scroll and click as you normally would.',
  },
  {
    key: 'project.story.label',
    label: 'Case study: story section, small heading',
    value: 'The story',
  },
  {
    key: 'project.gallery.label',
    label: 'Case study: screenshots section, small heading',
    value: 'On screen',
  },
  {
    key: 'project.share.label',
    label: 'Case study: share buttons heading',
    value: 'Share this project',
  },
  {
    key: 'project.share.copy',
    label: 'Case study: copy-link button',
    value: 'Copy link',
  },
  {
    key: 'project.share.copied',
    label: 'Case study: copy-link confirmation',
    value: 'Link copied',
  },
  {
    key: 'project.next.label',
    label: 'Next project: small heading',
    value: 'Next case study',
  },
  {
    key: 'project.close.label',
    label: 'Closing: small heading',
    value: 'Request a proposal',
  },
  {
    key: 'project.close.title',
    label: 'Closing: headline',
    value: 'Scope a project\nof your own.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'project.close.body',
    label: 'Closing: text',
    value:
      'This form arrives tagged to {client}, so we already know the kind of work you have in mind. A partner reads it and replies with a written point of view — not a calendar link.',
    kind: 'longtext',
    helpText: "Takes {client}, the project's client.",
  },

  // --------------------------------------------------------------- about
  { key: 'about.meta.title', label: 'Browser tab title', value: 'About' },
  {
    key: 'about.meta.description',
    label: 'Search engine description',
    value:
      'Who Sudo Tech Labs is: the principles the practice runs on, the tools it runs with, and the facts of the firm.',
    kind: 'longtext',
  },
  {
    key: 'about.meta.share-description',
    label: 'Description when the link is shared',
    value: 'The principles, the stack, and the facts of the practice.',
  },
  { key: 'about.hero.label', label: 'Hero: small heading', value: 'About' },
  {
    key: 'about.hero.title',
    label: 'Hero: headline',
    value: 'A practice,\nnot an agency.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'about.hero.image-alt',
    label: 'Hero: image description',
    value: 'The Sudo mark blind-debossed into a leather notebook.',
  },
  {
    key: 'about.layers.label',
    label: 'Layers: small heading',
    value: 'How the work is layered',
  },
  {
    key: 'about.principles.label',
    label: 'Principles: small heading',
    value: 'Principles',
  },
  {
    key: 'about.principles.body',
    label: 'Principles: text',
    value:
      'Four rules that decide arguments internally, which is the only test of whether a principle is real.',
    kind: 'longtext',
  },
  {
    key: 'about.stack.label',
    label: 'Stack: small heading',
    value: 'The stack',
  },
  {
    key: 'about.stack.title',
    label: 'Stack: headline',
    value: 'What the work is\nactually made of.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'about.facts.label',
    label: 'Facts: small heading',
    value: 'The facts',
  },
  {
    key: 'about.close.image-alt',
    label: 'Closing: image description',
    value: 'The Sudo mark embroidered into cotton canvas.',
  },
  {
    key: 'about.founder.label',
    label: 'About: founder section, small heading',
    value: 'Founder',
  },
  {
    key: 'about.founder.name',
    label: "About: founder's name (leave empty to hide the section)",
    value: '',
  },
  {
    key: 'about.founder.role',
    label: "About: founder's role",
    value: '',
  },
  {
    key: 'about.founder.photo',
    label: "About: founder's photo address (an https:// image link)",
    value: '',
  },
  {
    key: 'about.founder.note',
    label:
      'About: a personal note from the founder. Blank lines start new paragraphs',
    value: '',
  },
  {
    key: 'about.story.label',
    label: 'About: story timeline, small heading',
    value: 'The story',
  },
  {
    key: 'about.story.timeline',
    label:
      'About: story timeline, one line per moment, e.g. "2024 — First app on Google Play". Leave empty to hide',
    value: '',
  },
  {
    key: 'about.numbers.label',
    label: 'About: numbers, small heading',
    value: 'The numbers',
  },
  {
    key: 'about.availability.reply',
    label: 'About: availability, reply-time label',
    value: 'Replies',
  },
  {
    key: 'about.availability.status',
    label: 'About: availability, status label',
    value: 'Right now',
  },
  {
    key: 'about.close.label',
    label: 'Closing: small heading',
    value: 'Availability',
  },
  {
    key: 'about.close.title',
    label: 'Closing: headline',
    value: 'We take on a handful of\nengagements at a time.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'about.close.cta',
    label: 'Closing: button',
    value: 'Request a proposal',
  },

  // ------------------------------------------------------------- contact
  {
    key: 'contact.meta.title',
    label: 'Browser tab title',
    value: 'Request a proposal',
  },
  {
    key: 'contact.meta.description',
    label: 'Search engine description',
    value:
      'Send one form and you are done. Every enquiry is read by a partner and answered within one business day.',
    kind: 'longtext',
  },
  {
    key: 'contact.meta.share-description',
    label: 'Description when the link is shared',
    value:
      'Tell us what you are building. One form, one reply, no sales sequence.',
  },
  {
    key: 'contact.hero.label',
    label: 'Hero: small heading',
    value: 'Request a proposal',
  },
  {
    key: 'contact.hero.title',
    label: 'Hero: headline',
    value: 'Tell us what\nyou are building.',
    helpText: HEADLINE_HELP,
  },
  {
    key: 'contact.hero.body',
    label: 'Hero: text',
    value:
      'One form, and you are done. It reaches us directly and a person replies. We will tell you honestly if the work is not a fit for us.',
    kind: 'longtext',
  },
  {
    key: 'contact.origin.label',
    label: 'Starting-from: small heading',
    value: 'Starting from',
  },
  {
    key: 'contact.origin.body',
    label: 'Starting-from: text',
    value:
      'Your enquiry arrives tagged to this project, so we already know the kind of work you have in mind. Say what you would want done differently.',
    kind: 'longtext',
  },
  {
    key: 'contact.next.label',
    label: 'Next steps: small heading',
    value: 'What happens next',
  },
  {
    key: 'contact.next.step-1-title',
    label: 'Next step 1: title',
    value: 'It reaches a partner',
  },
  {
    key: 'contact.next.step-1-body',
    label: 'Next step 1: text',
    value: 'Not a shared inbox, not an outsourced sales desk.',
  },
  {
    key: 'contact.next.step-2-title',
    label: 'Next step 2: title',
    value: 'A reply inside a day',
  },
  {
    key: 'contact.next.step-2-body',
    label: 'Next step 2: text',
    value: '{responseWindow}',
    helpText: 'Takes {responseWindow} from site settings.',
  },
  {
    key: 'contact.next.step-3-title',
    label: 'Next step 3: title',
    value: 'A written point of view',
  },
  {
    key: 'contact.next.step-3-body',
    label: 'Next step 3: text',
    value:
      'What we would build, and what we would not, before anyone asks you for a budget.',
  },
  {
    key: 'contact.form.step',
    label: 'Contact form: step counter. {n} and {total} are numbers',
    value: 'Step {n} of {total}',
  },
  {
    key: 'contact.form.back',
    label: 'Contact form: back button',
    value: 'Back',
  },
  {
    key: 'contact.form.next',
    label: 'Contact form: next button',
    value: 'Next',
  },
  {
    key: 'contact.form.type-title',
    label: 'Contact form: step 1 question',
    value: 'What are we building?',
  },
  {
    key: 'contact.form.type-other',
    label: 'Contact form: step 1 last option',
    value: 'Something else',
  },
  {
    key: 'contact.form.budget-title',
    label: 'Contact form: step 2 question',
    value: 'What budget are you working with?',
  },
  {
    key: 'contact.form.timeline-title',
    label: 'Contact form: step 3 question',
    value: 'When do you need it?',
  },
  {
    key: 'contact.form.timeline-options',
    label: 'Contact form: step 3 options, one per line',
    value:
      'As soon as possible\nIn the next 1–3 months\nIn 3–6 months\nJust exploring for now',
  },
  {
    key: 'contact.form.details-title',
    label: 'Contact form: step 4 question',
    value: 'Where do we reply?',
  },
  {
    key: 'contact.form.draft-restored',
    label: 'Contact form: note when a saved draft is brought back',
    value: 'Your draft was kept. Pick up where you left off.',
  },
  {
    key: 'contact.form.start-over',
    label: 'Contact form: clear the draft',
    value: 'Start over',
  },
  {
    key: 'contact.alt.label',
    label: 'Contact: other ways to reach you, small heading',
    value: 'Prefer to talk?',
  },
  {
    key: 'contact.alt.whatsapp',
    label: 'Contact: WhatsApp option',
    value: 'WhatsApp',
  },
  {
    key: 'contact.alt.telegram',
    label: 'Contact: Telegram option',
    value: 'Telegram',
  },
  {
    key: 'contact.alt.email',
    label: 'Contact: email option',
    value: 'Email',
  },
  {
    key: 'contact.faq.label',
    label: 'Contact: questions, small heading',
    value: 'Questions',
  },
  {
    key: 'links.meta.title',
    label: 'Links page (/links): browser tab title',
    value: 'Links',
  },
  {
    key: 'links.meta.description',
    label: 'Links page: search description',
    value:
      'Our latest work, a live app demo, and every way to reach Sudo Tech Labs.',
  },
  {
    key: 'links.meta.share-description',
    label: 'Links page: description when the link is shared',
    value: 'Latest work, a live app demo, and a proposal in one tap.',
  },
  {
    key: 'links.try.label',
    label: 'Links page: app demo button, small line',
    value: 'Try our app demo',
  },
  {
    key: 'links.try.body',
    label: 'Links page: app demo button, main line. {title} is the project',
    value: 'Use {title}, live in your browser',
  },
  {
    key: 'links.proposal',
    label: 'Links page: proposal button',
    value: 'Get a proposal',
  },
  {
    key: 'links.whatsapp',
    label: 'Links page: WhatsApp button',
    value: 'Message us on WhatsApp',
  },
  {
    key: 'links.telegram',
    label: 'Links page: Telegram button',
    value: 'Message us on Telegram',
  },
  {
    key: 'links.work.label',
    label: 'Links page: latest work heading',
    value: 'Latest work',
  },
  {
    key: 'links.site',
    label: 'Links page: website button',
    value: 'Visit the website',
  },
  {
    key: 'links.socials.label',
    label: 'Links page: social accounts heading',
    value: 'Follow',
  },
  {
    key: 'reel.end.label',
    label: 'Reel: end card, small line',
    value: 'Want one like it?',
  },
  {
    key: 'reel.end.title',
    label: 'Reel: end card headline. {name} is the company name',
    value: 'Built by\n{name}.',
  },
  {
    key: 'reel.replay',
    label: 'Reel: hint to replay',
    value: 'Tap to replay',
  },
  {
    key: 'reel.paused',
    label: 'Reel: shown while paused',
    value: 'Paused · tap to play',
  },
  {
    key: 'contact.privacy.label',
    label: 'Confidentiality: small heading',
    value: 'Confidentiality',
  },
  {
    key: 'contact.privacy.body',
    label: 'Confidentiality: text',
    value:
      'Happy to sign an NDA before you share anything sensitive. Say so in your first message.',
    kind: 'longtext',
  },
  {
    key: 'contact.image-alt',
    label: 'Image description',
    value: 'The Sudo mark etched into a brushed steel plaque.',
  },
  // ------------------------------------------------- redesign (phase 6-7)
  {
    key: 'global.mobilebar.whatsapp',
    label: 'Phone bar: WhatsApp button',
    value: 'WhatsApp',
  },
  {
    key: 'global.mobilebar.cta',
    label: 'Phone bar: proposal button',
    value: 'Get a proposal',
  },
  {
    key: 'global.megamenu.label',
    label: 'Work menu (desktop): heading',
    value: 'Latest work',
  },
  {
    key: 'global.megamenu.body',
    label: 'Work menu (desktop): line under the heading',
    value: 'Real products, running inside the site. Open one and use it.',
  },
  {
    key: 'global.megamenu.all',
    label: 'Work menu (desktop): link to every project. {count} is the number',
    value: 'See all {count} projects',
  },
  {
    key: 'global.megamenu.try',
    label: 'Work menu (desktop): link that opens a project to try',
    value: 'Try it',
  },
  {
    key: 'global.megamenu.case',
    label: 'Work menu (desktop): link to the case study',
    value: 'Case study',
  },
  {
    key: 'global.menu.label',
    label: 'Phone menu: small heading',
    value: 'Menu',
  },
  {
    key: 'global.menu.contact-heading',
    label: 'Phone menu: contact heading',
    value: 'Talk to us',
  },
  {
    key: 'global.footer.cta-label',
    label: 'Footer: small heading over the big line',
    value: 'Next',
  },
  {
    key: 'global.footer.cta-title',
    label: 'Footer: big closing line',
    value: "Have an app in mind?\nLet's build it.",
    kind: 'longtext',
    helpText: 'Each line break starts a new line of the headline.',
  },
  {
    key: 'global.footer.cta',
    label: 'Footer: big button',
    value: 'Get a proposal',
  },
  {
    key: 'global.footer.follow-heading',
    label: 'Footer: social links heading',
    value: 'Follow the work',
  },
  {
    key: 'global.footer.whatsapp',
    label: 'Footer: WhatsApp link',
    value: 'Chat on WhatsApp',
  },
  {
    key: 'global.footer.telegram',
    label: 'Footer: Telegram link',
    value: 'Message on Telegram',
  },
  {
    key: 'global.footer.based',
    label: 'Footer: where the studio is',
    value: 'Addis Ababa, Ethiopia',
  },
  {
    key: 'global.cursor.view',
    label: 'Cursor label over a project',
    value: 'View',
  },
  {
    key: 'global.cursor.try',
    label: 'Cursor label over something to try',
    value: 'Try it',
  },
  {
    key: 'global.cursor.drag',
    label: 'Cursor label over something to drag',
    value: 'Drag',
  },
  {
    key: 'home.hero.trust',
    label: 'Hero: short trust line under the buttons',
    value:
      'Android, iOS and web \u00b7 Designed and built in Addis Ababa \u00b7 A reply within one business day',
    kind: 'longtext',
  },
  {
    key: 'home.hero.app-name',
    label: 'Hero: name shown in the sample app',
    value: 'Your app',
    helpText: 'Shown inside the phone in the hero until a project is featured.',
  },
  {
    key: 'home.hero.app-greeting',
    label: 'Hero: greeting in the sample app',
    value: 'Good morning',
  },
  { key: 'home.hero.scroll', label: 'Hero: scroll hint', value: 'Scroll' },
  {
    key: 'home.process.label',
    label: 'How it is built: small heading',
    value: 'How it gets built',
  },
  {
    key: 'home.process.title',
    label: 'How it is built: headline',
    value: 'From an idea\nto the Play Store.',
    kind: 'longtext',
    helpText: 'Each line break starts a new line of the headline.',
  },
  {
    key: 'home.process.step',
    label: 'How it is built: step counter',
    value: 'Step {n} of {total}',
    helpText: 'Takes {n} and {total}.',
  },
  { key: 'home.process.1-title', label: 'Step 1: title', value: 'Idea' },
  {
    key: 'home.process.1-body',
    label: 'Step 1: text',
    value:
      'We start with what the app has to do for your customers, and write it down in plain words before anything is drawn.',
    kind: 'longtext',
  },
  { key: 'home.process.2-title', label: 'Step 2: title', value: 'Design' },
  {
    key: 'home.process.2-body',
    label: 'Step 2: text',
    value:
      'Every screen designed and clickable, in your brand, so you can hold it in your hand before a line of code is written.',
    kind: 'longtext',
  },
  { key: 'home.process.3-title', label: 'Step 3: title', value: 'Build' },
  {
    key: 'home.process.3-body',
    label: 'Step 3: text',
    value:
      'One Flutter codebase for Android and iOS, with an admin dashboard you control. You see a working build every week.',
    kind: 'longtext',
  },
  { key: 'home.process.4-title', label: 'Step 4: title', value: 'Launch' },
  {
    key: 'home.process.4-body',
    label: 'Step 4: text',
    value:
      'Published to Google Play and the App Store, watched closely through the first weeks, and improved from what real people do.',
    kind: 'longtext',
  },
  {
    key: 'home.services.label',
    label: 'What we build: small heading',
    value: 'What we build',
  },
  {
    key: 'home.services.title',
    label: 'What we build: headline',
    value: 'Everything an app\nneeds to succeed.',
    kind: 'longtext',
    helpText: 'Each line break starts a new line of the headline.',
  },
  {
    key: 'home.services.cta',
    label: 'What we build: link to services',
    value: 'All services',
  },
  { key: 'home.try.label', label: 'Try it: small heading', value: 'Try it' },
  {
    key: 'home.try.title',
    label: 'Try it: headline',
    value: 'See your app\nbefore it exists.',
    kind: 'longtext',
    helpText: 'Each line break starts a new line of the headline.',
  },
  {
    key: 'home.try.body',
    label: 'Try it: text',
    value:
      'Type its name and choose a colour. The phone becomes yours \u2014 this is where every project starts.',
    kind: 'longtext',
  },
  {
    key: 'home.try.name-label',
    label: 'Try it: name field label',
    value: 'App name',
  },
  {
    key: 'home.try.colour-label',
    label: 'Try it: colour label',
    value: 'Brand colour',
  },
  {
    key: 'home.try.cta',
    label: 'Try it: button',
    value: 'Build this for real',
  },
  {
    key: 'home.figures.title',
    label: 'Numbers: headline',
    value: 'Counted from the work,\nnot claimed.',
    kind: 'longtext',
    helpText: 'Each line break starts a new line of the headline.',
  },
  {
    key: 'home.voices.label',
    label: 'Testimonials: small heading',
    value: 'In their words',
  },
  {
    key: 'home.faq.label',
    label: 'Questions: small heading',
    value: 'Questions',
  },
  {
    key: 'home.faq.title',
    label: 'Questions: headline',
    value: 'Before you ask.',
  },
  // ----------------------------------------------- preview room (phase 5)
  {
    key: 'global.preview.mode-try',
    label: 'Preview: try-it tab',
    value: 'Try it',
  },
  {
    key: 'global.preview.mode-screens',
    label: 'Preview: screens tab',
    value: 'Screens',
  },
  {
    key: 'global.preview.mode-story',
    label: 'Preview: story tab',
    value: 'Story',
  },
  {
    key: 'global.preview.share',
    label: 'Preview: copy link button',
    value: 'Copy link',
  },
  {
    key: 'global.preview.copied',
    label: 'Preview: after the link is copied',
    value: 'Link copied',
  },
  {
    key: 'global.preview.previous-project',
    label: 'Preview: previous project, for screen readers',
    value: 'Previous project',
  },
  {
    key: 'global.preview.next-project',
    label: 'Preview: next project, for screen readers',
    value: 'Next project',
  },
  {
    key: 'global.preview.loading',
    label: 'Preview: while the app loads',
    value: 'Opening the app\u2026',
  },
  {
    key: 'global.preview.try-hint',
    label: 'Preview: how to use the app',
    value:
      'Tap the screen as you would on a phone. Swipe from the left edge, or press Back, to go back.',
  },
  {
    key: 'global.preview.platform-android',
    label: 'Platform name: Android',
    value: 'Android',
  },
  {
    key: 'global.preview.platform-ios',
    label: 'Platform name: iPhone',
    value: 'iPhone',
  },
  {
    key: 'global.preview.platform-web',
    label: 'Platform name: website',
    value: 'Website',
  },
  {
    key: 'global.preview.page-default',
    label: 'Website preview: name of a page with no name',
    value: 'Home',
  },
  {
    key: 'global.preview.view-desktop',
    label: 'Website preview: computer view',
    value: 'Computer',
  },
  {
    key: 'global.preview.view-tablet',
    label: 'Website preview: tablet view',
    value: 'Tablet',
  },
  {
    key: 'global.preview.view-mobile',
    label: 'Website preview: phone view',
    value: 'Phone',
  },
  {
    key: 'global.preview.scroll-hint',
    label: 'Website preview: how to use it',
    value:
      'Rest the pointer on the page, or tap it, to scroll through the whole page.',
  },
  {
    key: 'global.prototype.back',
    label: 'App preview: back button',
    value: 'Back',
  },
  {
    key: 'global.prototype.show-taps',
    label: 'App preview: show the tappable places',
    value: 'Show taps',
  },
  {
    key: 'global.prototype.hide-taps',
    label: 'App preview: hide the tappable places',
    value: 'Hide taps',
  },
  {
    key: 'global.prototype.restart',
    label: 'App preview: start again',
    value: 'Restart',
  },
  {
    key: 'global.prototype.empty',
    label: 'App preview: shown when there are no screens',
    value: 'This prototype has no screens yet.',
  },
  {
    key: 'global.prototype.hint',
    label: 'App preview: description for screen readers',
    value:
      '{title}. Tap the screen to move through the app. Backspace goes back.',
    helpText: "Takes {title}, the screen's name.",
  },
  {
    key: 'global.prototype.show-screen',
    label: 'App preview: jump to a screen, for screen readers',
    value: 'Show {title}',
    helpText: "Takes {title}, the screen's name.",
  },
  {
    key: 'global.prototype.go-to',
    label: 'App preview: a tappable place, for screen readers',
    value: 'Go to {title}',
    helpText: 'Takes {title}, the screen it opens.',
  },
];

/** `home.hero.title` → `{ page: 'home', section: 'hero' }`. */
export function placeOf(key: string): { page: string; section: string } {
  const [page, section = 'general'] = key.split('.');
  return { page, section };
}

export function catalogueMap(): Record<string, string> {
  return Object.fromEntries(
    SITE_COPY_CATALOGUE.map((entry) => [entry.key, entry.value]),
  );
}
