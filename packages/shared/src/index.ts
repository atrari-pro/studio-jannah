export {
  site,
  navigation,
  magRubriques,
  brands,
  employerScopes,
  capabilities,
  methodSteps,
  missions,
} from "./site.js";
export type { MagRubriqueId, MagFormat } from "./site.js";
export {
  track,
  trackPageView,
  trackVirtualPage,
  trackCta,
  trackCampaignLand,
  pushDataLayer,
  tagPlanV0,
  SjEvent,
  initSjDataLayer,
} from "./tracking.js";
export type { TrackingEventName, TrackingPayload } from "./tracking.js";
export {
  DL_SCHEMA_VERSION,
  DL_BRAND,
  tagPlanV1,
} from "./datalayer/contract.js";
