/**
 * Studio Jannah — Data Layer Contract v1
 * Measurement Agent — nomenclature pro, hits structurés, pas de réinit abusive
 */

export const DL_SCHEMA_VERSION = "1.0.0";
export const DL_BRAND = "studio_jannah";

/** Events métier (objets plain). Les Arguments gtag Consent Mode restent séparés. */
export const SjEvent = {
  PAGE_VIEW: "sj_page_view",
  VIRTUAL_PAGE_VIEW: "sj_virtual_page_view",
  CTA_CLICK: "sj_cta_click",
  OUTBOUND_CLICK: "sj_outbound_click",
  SCROLL_DEPTH: "sj_scroll_depth",
  CAMPAIGN_LAND: "sj_campaign_land",
  FUNNEL_STEP: "sj_funnel_step",
  LEAD_SUBMIT: "sj_lead_submit",
  CONSENT_UPDATE: "sj_consent_update",
  CMP_READY: "sj_cmp_ready",
} as const;

export type SjEventName = (typeof SjEvent)[keyof typeof SjEvent];

export type PageType =
  | "home"
  | "mag_hub"
  | "mag_article"
  | "use_case_hub"
  | "use_case"
  | "about"
  | "contact"
  | "legal"
  | "acquisition"
  | "app_bridge"
  | "ao"
  | "app_demo"
  | "other";

export type ContentGroup =
  | "corporate"
  | "mag"
  | "use_cases"
  | "acquisition"
  | "product"
  | "legal"
  | "other";

export type Surface = "web" | "app";

/** CTA : zone_objet_action (snake) */
export type CtaId = string;

export type SjHitBase = {
  event: SjEventName;
  event_id: string;
  event_ts: number;
  schema_version: typeof DL_SCHEMA_VERSION;
  brand: typeof DL_BRAND;
  surface: Surface;
  page_path: string;
  page_title: string;
  page_type: PageType;
  content_group: ContentGroup;
  consent_analytics: boolean;
};

export type SjHit = SjHitBase & Record<string, string | number | boolean | undefined>;

export const tagPlanV1 = [
  {
    event: SjEvent.CMP_READY,
    when: "CMP initialisée (une fois / page load)",
    keys: ["cmp_name", "cmp_id"],
  },
  {
    event: SjEvent.CONSENT_UPDATE,
    when: "Changement opt-in analytics / ads",
    keys: ["consent_analytics", "consent_ads", "consent_source"],
  },
  {
    event: SjEvent.PAGE_VIEW,
    when: "1× par navigation réelle (dédup path+load) ; flush post-consent si besoin",
    keys: ["page_path", "page_title", "page_type", "content_group"],
  },
  {
    event: SjEvent.VIRTUAL_PAGE_VIEW,
    when: "Étape SPA / wizard / filtre (jamais à la place du page_view initial)",
    keys: ["page_path", "virtual_path", "funnel_id"],
  },
  {
    event: SjEvent.CTA_CLICK,
    when: "[data-track-cta] — id = zone_objet_action",
    keys: ["cta_id", "cta_label", "cta_zone"],
  },
  {
    event: SjEvent.OUTBOUND_CLICK,
    when: "Lien externe http(s) hors domaine",
    keys: ["link_url", "link_domain"],
  },
  {
    event: SjEvent.SCROLL_DEPTH,
    when: "25/50/75/90/100 — 1× chacun / page",
    keys: ["scroll_percent"],
  },
  {
    event: SjEvent.CAMPAIGN_LAND,
    when: "Landings /go/* + UTMs",
    keys: ["campaign_source", "campaign_medium", "campaign_name", "campaign_content"],
  },
  {
    event: SjEvent.FUNNEL_STEP,
    when: "Wizard app / parcours guidé",
    keys: ["funnel_id", "funnel_step", "funnel_step_index", "funnel_status"],
  },
  {
    event: SjEvent.LEAD_SUBMIT,
    when: "Formulaire contact (succès client)",
    keys: ["form_id", "form_status"],
  },
] as const;

/** Mapping legacy → v1 (migration douce GTM) */
export const legacyEventMap: Record<string, SjEventName> = {
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
