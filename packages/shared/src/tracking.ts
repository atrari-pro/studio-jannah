/**
 * @deprecated Import préféré: `@studio-jannah/shared/datalayer`
 * Façade rétrocompatible → contrat v1
 */

export {
  track,
  trackPageView,
  trackVirtualPage,
  trackCta,
  trackCampaignLand,
  initSjDataLayer,
  ensureDataLayer,
  SjEvent,
} from "./datalayer/runtime.js";

export { DL_SCHEMA_VERSION, tagPlanV1 as tagPlanV0, legacyEventMap } from "./datalayer/contract.js";

export type { TrackInput as TrackingPayload } from "./datalayer/runtime.js";
export type { SjEventName as TrackingEventName } from "./datalayer/contract.js";

import { ensureDataLayer, track } from "./datalayer/runtime.js";
import type { TrackInput } from "./datalayer/runtime.js";

/** @deprecated use track() */
export function pushDataLayer(payload: TrackInput): void {
  ensureDataLayer();
  track(payload);
}
