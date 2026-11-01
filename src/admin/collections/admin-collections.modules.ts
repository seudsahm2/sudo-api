import { createCollectionModule } from './admin-collection.factory';
import { AdminSiteCopyValuesController } from './admin-site-copy-values.controller';
import {
  clientLogoSpec,
  faqSpec,
  prototypeHotspotSpec,
  prototypeScreenSpec,
  siteCopySpec,
  testimonialSpec,
  workProjectHighlightSpec,
} from './collection-specs';

/** Every admin collection defined as a spec rather than written out by hand. */
export const ADMIN_COLLECTION_MODULES = [
  createCollectionModule(siteCopySpec, [AdminSiteCopyValuesController]),
  createCollectionModule(testimonialSpec),
  createCollectionModule(clientLogoSpec),
  createCollectionModule(faqSpec),
  createCollectionModule(workProjectHighlightSpec),
  createCollectionModule(prototypeScreenSpec),
  createCollectionModule(prototypeHotspotSpec),
];
