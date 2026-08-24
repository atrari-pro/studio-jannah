/**
 * API dataLayer Studio Jannah (runtime navigateur + app)
 * Ne recrée JAMAIS dataLayer s’il existe déjà.
 */

import {
  DL_BRAND,
  DL_SCHEMA_VERSION,
  SjEvent,
  type ContentGroup,
  type PageType,
  type SjEventName,
  type SjHit,
  type Surface,
} from "./contract.js";

export type TrackInput = {
  event: SjEventName | string;
  page_path?: string;
  page_title?: string;
  page_type?: PageType;
  content_group?: ContentGroup;
  surface?: Surface;
  [key: string]: string | number | boolean | undefined;
};

type SjRuntime = {
  version: string;
  push: (hit: TrackInput) => void;
  setContext: (ctx: Partial<SjPageContext>) => void;
  setConsent: (analytics: boolean, ads?: boolean, source?: string) => void;
  getConsent: () => { analytics: boolean; ads: boolean };
  flushQueue: () => void;
};

type SjPageContext = {
  page_path: string;
  page_title: string;
  page_type: PageType;
  content_group: ContentGroup;
  surface: Surface;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    sj?: SjRuntime;
    sjTrack?: (payload: TrackInput) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureDataLayer(): unknown[] {
  if (typeof window === "undefined") return [];
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  return window.dataLayer;
}

function eventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapLegacyEvent(name: string): SjEventName {
  const map: Record<string, SjEventName> = {
    page_view: SjEvent.PAGE_VIEW,
    virtual_page_view: SjEvent.VIRTUAL_PAGE_VIEW,
    cta_click: SjEvent.CTA_CLICK,
    outbound_click: SjEvent.OUTBOUND_CLICK,
    scroll_depth: SjEvent.SCROLL_DEPTH,
    campaign_land: SjEvent.CAMPAIGN_LAND,
    funnel_step: SjEvent.FUNNEL_STEP,
    lead_submit: SjEvent.LEAD_SUBMIT,
    cmp_ready: SjEvent.CMP_READY,
    sj_consent_analytics_granted: SjEvent.CONSENT_UPDATE,
  };
  // Un event déjà namespacé sj_* (connu ou nouveau) passe tel quel — ne jamais
  // le requalifier silencieusement en sj_page_view (cf. public/sj/datalayer.js
  // qui fait `LEGACY[name] || name`, sans fallback dangereux).
  return map[name] || (name as SjEventName);
}

const ANALYTICS_GATED = new Set<string>([
  SjEvent.PAGE_VIEW,
  SjEvent.VIRTUAL_PAGE_VIEW,
  SjEvent.CTA_CLICK,
  SjEvent.OUTBOUND_CLICK,
  SjEvent.SCROLL_DEPTH,
  SjEvent.CAMPAIGN_LAND,
  SjEvent.FUNNEL_STEP,
  SjEvent.LEAD_SUBMIT,
]);

let ctx: SjPageContext = {
  page_path: "/",
  page_title: "",
  page_type: "other",
  content_group: "other",
  surface: "web",
};

let consent = { analytics: false, ads: false };
const queue: SjHit[] = [];
const seenPageViews = new Set<string>();
const seenScroll = new Set<string>();
let ready = false;

function buildHit(input: TrackInput): SjHit {
  const event = mapLegacyEvent(String(input.event));

  const {
    event: _ignored,
    page_path = ctx.page_path,
    page_title = ctx.page_title,
    page_type = ctx.page_type,
    content_group = ctx.content_group,
    surface = ctx.surface,
    ...rest
  } = input;

  return {
    ...rest,
    event,
    event_id: eventId(),
    event_ts: Date.now(),
    schema_version: DL_SCHEMA_VERSION,
    brand: DL_BRAND,
    surface,
    page_path,
    page_title,
    page_type,
    content_group,
    consent_analytics: consent.analytics,
  };
}

function pushRaw(hit: SjHit): void {
  ensureDataLayer().push(hit);
}

function shouldDedupe(hit: SjHit): boolean {
  if (hit.event === SjEvent.PAGE_VIEW) {
    const key = `${hit.page_path}::${hit.surface}`;
    if (seenPageViews.has(key)) return true;
    seenPageViews.add(key);
  }
  if (hit.event === SjEvent.SCROLL_DEPTH) {
    const key = `${hit.page_path}::${hit.scroll_percent}`;
    if (seenScroll.has(key)) return true;
    seenScroll.add(key);
  }
  return false;
}

function pushHit(input: TrackInput): void {
  if (typeof window === "undefined") return;
  const hit = buildHit(input);

  if (shouldDedupe(hit)) return;

  if (ANALYTICS_GATED.has(hit.event) && !consent.analytics) {
    queue.push(hit);
    return;
  }

  pushRaw(hit);
}

function flushQueue(): void {
  if (!consent.analytics) return;
  while (queue.length) {
    const hit = queue.shift();
    if (!hit) break;
    hit.consent_analytics = true;
    hit.flushed_from_queue = true;
    if (shouldDedupe(hit)) continue;
    pushRaw(hit);
  }
}

function setConsent(analytics: boolean, ads = false, source = "cmp"): void {
  const prev = consent.analytics;
  consent = { analytics, ads };
  pushRaw(
    buildHit({
      event: SjEvent.CONSENT_UPDATE,
      consent_analytics: analytics,
      consent_ads: ads,
      consent_source: source,
    }),
  );
  if (analytics && !prev) flushQueue();
}

function setContext(next: Partial<SjPageContext>): void {
  ctx = { ...ctx, ...next };
}

function installRuntime(): void {
  if (typeof window === "undefined" || ready) return;
  ensureDataLayer();

  const api: SjRuntime = {
    version: DL_SCHEMA_VERSION,
    push: pushHit,
    setContext,
    setConsent,
    getConsent: () => ({ ...consent }),
    flushQueue,
  };

  window.sj = api;
  window.sjTrack = (payload) => pushHit(payload);
  ready = true;
}

export function initSjDataLayer(initial?: Partial<SjPageContext>): void {
  installRuntime();
  if (initial) setContext(initial);
}

export function track(payload: TrackInput): void {
  installRuntime();
  pushHit(payload);
}

export function trackPageView(path: string, title: string, extra?: Partial<TrackInput>): void {
  track({
    event: SjEvent.PAGE_VIEW,
    page_path: path,
    page_title: title,
    ...extra,
  });
}

export function trackVirtualPage(
  path: string,
  title: string,
  extra?: Partial<TrackInput>,
): void {
  track({
    event: SjEvent.VIRTUAL_PAGE_VIEW,
    page_path: path,
    page_title: title,
    virtual_path: path,
    ...extra,
  });
}

export function trackCta(ctaId: string, ctaLabel: string, extra?: Partial<TrackInput>): void {
  const zone = ctaId.split("_")[0] ?? "unknown";
  track({
    event: SjEvent.CTA_CLICK,
    cta_id: ctaId,
    cta_label: ctaLabel,
    cta_zone: zone,
    ...extra,
  });
}

export function trackCampaignLand(params: {
  path: string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
}): void {
  track({
    event: SjEvent.CAMPAIGN_LAND,
    page_path: params.path,
    campaign_source: params.source ?? undefined,
    campaign_medium: params.medium ?? undefined,
    campaign_name: params.campaign ?? undefined,
    campaign_content: params.content ?? undefined,
  });
}

export { SjEvent, ensureDataLayer };
export type { SjRuntime, SjPageContext };
