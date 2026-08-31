/**
 * Runtime dataLayer Studio Jannah v1 — chargé EN PREMIER dans <head>
 * Règles:
 * - dataLayer = tableau unique ; jamais réassigné s'il existe déjà
 * - events métier = objets plain namespacés sj_*
 * - Arguments gtag (Consent Mode) = cohabitent, non touchés
 * - file d'attente interne jusqu'au consent analytics (rien de "queued" polluant le DL)
 * - dédup page_view par page load
 */
(function () {
  "use strict";

  var SCHEMA = "1.2.0";
  var BRAND = "studio_jannah";

  var E = {
    // "page_view" (pas sj_page_view) — nom standard GA4/GTM, pour matcher
    // directement l'événement "recommandé" au lieu de forcer un Custom Event
    // trigger générique côté GTM. ATTENTION mise en prod : le tag de
    // configuration GA4 dans GTM doit avoir "Send a page view event when
    // this configuration loads" DÉSACTIVÉ, sinon double comptage (son
    // page_view auto + celui poussé ici) — voir docs/TRACKING_DATALAYER.md.
    PAGE_VIEW: "page_view",
    VIRTUAL_PAGE_VIEW: "sj_virtual_page_view",
    CTA_CLICK: "sj_cta_click",
    OUTBOUND_CLICK: "sj_outbound_click",
    CAMPAIGN_LAND: "sj_campaign_land",
    FUNNEL_STEP: "sj_funnel_step",
    LEAD_SUBMIT: "sj_lead_submit",
    CONSENT_UPDATE: "sj_consent_update",
    CMP_READY: "sj_cmp_ready",
  };

  var LEGACY = {
    // page_view retiré : E.PAGE_VIEW vaut déjà "page_view", le mapping
    // devenait une identité (name === LEGACY[name]) — mort depuis le
    // renommage sj_page_view → page_view.
    virtual_page_view: E.VIRTUAL_PAGE_VIEW,
    cta_click: E.CTA_CLICK,
    outbound_click: E.OUTBOUND_CLICK,
    campaign_land: E.CAMPAIGN_LAND,
    funnel_step: E.FUNNEL_STEP,
    lead_submit: E.LEAD_SUBMIT,
    cmp_ready: E.CMP_READY,
    sj_consent_analytics_granted: E.CONSENT_UPDATE,
  };

  var GATED = {};
  GATED[E.PAGE_VIEW] = 1;
  GATED[E.VIRTUAL_PAGE_VIEW] = 1;
  GATED[E.CTA_CLICK] = 1;
  GATED[E.OUTBOUND_CLICK] = 1;
  GATED[E.CAMPAIGN_LAND] = 1;
  GATED[E.FUNNEL_STEP] = 1;
  GATED[E.LEAD_SUBMIT] = 1;

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }

  if (window.sj && window.sj.version === SCHEMA) {
    return;
  }

  var ctx = {
    page_path: location.pathname || "/",
    page_title: document.title || "",
    page_type: "other",
    content_group: "other",
    surface: "web",
  };

  var consent = { analytics: false, ads: false };
  var queue = [];
  var seenPV = {};

  function eid() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return "sj_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function mapEvent(name) {
    return LEGACY[name] || name;
  }

  function build(input) {
    var event = mapEvent(input.event);
    var hit = {
      event: event,
      event_id: eid(),
      event_ts: Date.now(),
      schema_version: SCHEMA,
      brand: BRAND,
      surface: input.surface || ctx.surface,
      page_path: input.page_path != null ? input.page_path : ctx.page_path,
      page_title: input.page_title != null ? input.page_title : ctx.page_title,
      page_type: input.page_type || ctx.page_type,
      content_group: input.content_group || ctx.content_group,
      consent_analytics: consent.analytics,
    };
    for (var k in input) {
      if (!Object.prototype.hasOwnProperty.call(input, k)) continue;
      if (
        k === "event" ||
        k === "page_path" ||
        k === "page_title" ||
        k === "page_type" ||
        k === "content_group" ||
        k === "surface"
      ) {
        continue;
      }
      if (input[k] !== undefined) hit[k] = input[k];
    }
    return hit;
  }

  function dedupe(hit) {
    if (hit.event === E.PAGE_VIEW) {
      var pk = hit.page_path + "::" + hit.surface;
      if (seenPV[pk]) return true;
      seenPV[pk] = 1;
    }
    return false;
  }

  function pushRaw(hit) {
    window.dataLayer.push(hit);
  }

  function push(input) {
    if (!input || !input.event) return;
    var hit = build(input);
    if (dedupe(hit)) return;
    if (GATED[hit.event] && !consent.analytics) {
      queue.push(hit);
      return;
    }
    pushRaw(hit);
  }

  function flushQueue() {
    if (!consent.analytics) return;
    while (queue.length) {
      var hit = queue.shift();
      hit.consent_analytics = true;
      hit.flushed_from_queue = true;
      if (dedupe(hit)) continue;
      pushRaw(hit);
    }
  }

  // Cookie posé par vanilla-cookieconsent (voir ConsentBoot.astro) — JSON
  // encodé en URI, forme { categories: string[], services: {...}, ... }.
  // "analytics" est le nom de la catégorie unique de mesure d'audience.
  // sj_cmp_consent (pas sj_consent) — l'ancienne CMP tarteaucitron utilisait
  // déjà "sj_consent" avec un format non-JSON ; même nom réutilisé ici pour
  // vanilla-cookieconsent aurait fait coexister deux cookies "sj_consent" à
  // path différents chez tout visiteur ayant connu l'ancienne CMP, et lequel
  // des deux `document.cookie` renvoie en premier n'est pas garanti — le
  // bandeau CMP se réaffichait alors à chaque chargement (bug constaté).
  function readConsentCookie() {
    try {
      var m = document.cookie.match(/(?:^|; )sj_cmp_consent=([^;]*)/);
      if (!m) return false;
      var val = JSON.parse(decodeURIComponent(m[1]));
      return !!(val && val.categories && val.categories.indexOf("analytics") !== -1);
    } catch (e) {
      return false;
    }
  }

  function setConsent(analytics, ads, source) {
    var prev = consent.analytics;
    consent.analytics = !!analytics;
    consent.ads = !!ads;
    pushRaw(
      build({
        event: E.CONSENT_UPDATE,
        consent_analytics: consent.analytics,
        consent_ads: consent.ads,
        consent_source: source || "cmp",
      }),
    );
    if (consent.analytics && !prev) flushQueue();
  }

  function setContext(next) {
    for (var k in next) {
      if (Object.prototype.hasOwnProperty.call(next, k) && next[k] != null) {
        ctx[k] = next[k];
      }
    }
  }

  // Hydrate consent déjà donné (retour visiteur) sans spam event si false
  if (readConsentCookie()) {
    consent.analytics = true;
  }

  window.sj = {
    version: SCHEMA,
    events: E,
    push: push,
    setContext: setContext,
    setConsent: setConsent,
    getConsent: function () {
      return { analytics: consent.analytics, ads: consent.ads };
    },
    flushQueue: flushQueue,
    ensureDataLayer: function () {
      if (!Array.isArray(window.dataLayer)) window.dataLayer = [];
      return window.dataLayer;
    },
  };

  window.sjTrack = function (payload) {
    push(payload);
  };
})();
