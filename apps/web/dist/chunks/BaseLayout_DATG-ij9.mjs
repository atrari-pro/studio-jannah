import { f as createAstro, c as createComponent, m as maybeRenderHead, b as addAttribute, r as renderTemplate, a as renderComponent, d as renderScript, e as defineScriptVars, g as renderSlot, h as renderHead } from './astro/server_BN1mmHq8.mjs';
/* empty css                            */
/* empty css                         */

const site = {
  name: "Studio Jannah",
  tagline: "L'atelier du signal",
  magazine: {
    name: "Jannah Mag",
    headline: "Le mag du signal",
    tagline: "Ton magazine d’articles — tendances trafic, métiers digitaux, produits — toujours ramenés à la mesure. Esprit Semrush, signature Studio Jannah."
  },
  expert: {
    name: "Mohamed Atrari",
    role: "Data Marketing Analytics Engineer",
    years: 8
  }};
const navigation = [
  { href: "/#expertises", label: "Expertises" },
  { href: "/#missions", label: "Missions" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/mag", label: "Le Mag" },
  { href: "/contact", label: "Contact" }
];
const brands = [
  {
    id: "nordline",
    name: "Nordline Energy",
    sector: "Énergie",
    note: "Réconciliation leads ↔ analytics sur parcours multi-domaines."
  },
  {
    id: "atelier-or",
    name: "Atelier Or",
    sector: "Luxe / Retail",
    note: "Funnel checkout instrumenté, tests lus sur un signal propre."
  },
  {
    id: "pulse-mobile",
    name: "Pulse Mobile",
    sector: "Télécom",
    note: "sGTM first-party et match rate ads sous contrainte CMP."
  },
  {
    id: "clara-beauty",
    name: "Clara Beauty",
    sector: "Cosmétique",
    note: "Plan de taggage GA4 + recette pour équipes acquisition."
  },
  {
    id: "glassfix",
    name: "Glassfix",
    sector: "Services",
    note: "Audit tracking / consentement avant refonte media."
  },
  {
    id: "haven-bank",
    name: "Haven Bank",
    sector: "Finance",
    note: "Écart PSP ↔ CRM ↔ analytics sous le seuil métier."
  }
];
const capabilities = [
  {
    id: "mesure",
    n: "01",
    title: "Mesure & tracking",
    anchor: "Fondation",
    summary: "Architectures de collecte fiables : GA4, Piano, TMS, server-side (sGTM), conformité CMP/RGPD.",
    points: ["Audit & plan de taggage", "sGTM / first-party", "CMP & Consent Mode"]
  },
  {
    id: "cro",
    n: "02",
    title: "CRO & expérimentation",
    anchor: "Conversion",
    summary: "Tests A/B, scoring, analyse UX — convertir mieux sans augmenter le budget média.",
    points: ["Hypothèses instrumentées", "A/B & feature flags", "Parcours & friction"]
  },
  {
    id: "data-stack",
    n: "03",
    title: "Data stack marketing",
    anchor: "Activation",
    summary: "BigQuery, dbt, pipelines et activation : de la donnée brute à la décision.",
    points: ["Pipelines & modèles", "Dashboards pilotables", "Réconciliation métier"]
  },
  {
    id: "ia",
    n: "04",
    title: "IA appliquée au marketing",
    anchor: "Quand le signal tient",
    summary: "Modèles et automatisations au service de l’attribution, du scoring et de l’activation — quand le signal le justifie.",
    points: ["Scoring & priorisation", "Activation ciblée", "Garde-fous mesure"]
  }
];
const missions = [
  {
    n: "01",
    title: "Audit tracking & conformité",
    text: "Cartographier les trous de collecte, le consentement et l’écart analytics vs métier.",
    format: "One-shot",
    duration: "2–3 sem.",
    sector: "Retail / e-com",
    outcome: "+18 pts couverture events clés",
    stack: ["GA4", "CMP", "GTM"]
  },
  {
    n: "02",
    title: "Setup GA4 / Piano & TMS",
    text: "Plan de taggage, implémentation, recette et documentation exploitable par les équipes.",
    format: "One-shot",
    duration: "3–5 sem.",
    sector: "Services B2B",
    outcome: "Plan de taggage + runbook livrés",
    stack: ["GA4", "Piano", "TMS"]
  },
  {
    n: "03",
    title: "Tracking server-side (sGTM)",
    text: "Renforcer les signaux utiles aux analyses et aux plateformes media, sans data leakage.",
    format: "Fil rouge",
    duration: "4–8 sem.",
    sector: "Télécom",
    outcome: "+22 % match rate ads (fictif)",
    stack: ["sGTM", "first-party", "Consent Mode"]
  },
  {
    n: "04",
    title: "CRO & expérimentation",
    text: "Instrumenter le funnel, prioriser les tests, lire des résultats sur un signal fiable.",
    format: "Fil rouge",
    duration: "8–12 sem.",
    sector: "Luxe / Retail",
    outcome: "+0,9 pt CVR checkout (fictif)",
    stack: ["A/B", "feature flags", "funnel"]
  },
  {
    n: "05",
    title: "Réconciliation & attribution",
    text: "Relier PSP, CRM et analytics quand le parcours sort du domaine (paiement, offline).",
    format: "One-shot",
    duration: "3–6 sem.",
    sector: "Finance",
    outcome: "Écart PSP ↔ analytics < 3 %",
    stack: ["PSP", "BigQuery", "CRM"]
  },
  {
    n: "06",
    title: "Data stack & activation IA",
    text: "Pipelines, features et modèles — seulement quand la mesure de base tient la route.",
    format: "Fil rouge",
    duration: "6–10 sem.",
    sector: "Énergie",
    outcome: "Scoring lead en prod (garde-fous)",
    stack: ["dbt", "BQ", "scoring"]
  }
];
const methodSteps = [
  {
    n: "01",
    title: "Diagnostiquer le signal",
    text: "Audit de collecte, écarts métier vs analytics, priorisation par impact business."
  },
  {
    n: "02",
    title: "Fiabiliser la mesure",
    text: "Plan de taggage, sGTM, consentement, documentation — données actionnables."
  },
  {
    n: "03",
    title: "Activer & apprendre",
    text: "CRO, dashboards, attribution, IA ciblée — itérer sur des métriques fiables."
  }
];

const $$Astro$3 = createAstro("https://atrari-pro.github.io/studio-jannah");
const $$Logo = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$Logo;
  const {
    variant = "full",
    size = 28,
    inverted = false,
    class: className = ""
  } = Astro2.props;
  const label = site.name;
  const showWord = variant === "full";
  return renderTemplate`${maybeRenderHead()}<span${addAttribute(["sj-logo", inverted && "sj-logo--inverted", className], "class:list")}${addAttribute(`--sj-logo-size: ${size}px`, "style")} data-astro-cid-tvrurpns> <svg class="sj-logo__mark"${addAttribute(size, "width")}${addAttribute(size, "height")} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-astro-cid-tvrurpns> <!-- Atelier : cadre ouvert --> <path class="sj-logo__frame" d="M6 10V6h4M30 6h4v4M34 30v4h-4M10 34H6v-4" stroke="currentColor" stroke-width="2" stroke-linecap="square" data-astro-cid-tvrurpns></path> <!-- Signal : trois impulsions ascendantes --> <path class="sj-logo__pulse sj-logo__pulse--1" d="M12 26v-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" data-astro-cid-tvrurpns></path> <path class="sj-logo__pulse sj-logo__pulse--2" d="M18 26V14" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" data-astro-cid-tvrurpns></path> <path class="sj-logo__pulse sj-logo__pulse--3" d="M24 26V10" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" data-astro-cid-tvrurpns></path> <!-- Point signal doré --> <circle class="sj-logo__dot" cx="30" cy="12" r="2.5" fill="var(--sj-signal)" data-astro-cid-tvrurpns></circle> </svg> ${showWord && renderTemplate`<span class="sj-logo__word" data-astro-cid-tvrurpns> <span class="sj-logo__name" data-astro-cid-tvrurpns>${label}</span> </span>`} ${!showWord && renderTemplate`<span class="visually-hidden" data-astro-cid-tvrurpns>${label}</span>`} </span> `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/Logo.astro", void 0);

function withBase(href) {
  const base = "/".replace(/\/$/, "");
  if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#") || href.startsWith("mailto:")) {
    return href;
  }
  if (href === "/") return `${base}/` || "/";
  return `${base}${href.startsWith("/") ? href : `/${href}`}`;
}

const $$SiteHeader = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<header class="header" data-header data-astro-cid-ctg3m53h> <div class="wrap header__inner" data-astro-cid-ctg3m53h> <a class="header__logo"${addAttribute(withBase("/"), "href")} data-track-cta="header_logo_home" data-track-label="Studio Jannah" data-astro-cid-ctg3m53h> ${renderComponent($$result, "Logo", $$Logo, { "variant": "full", "size": 30, "data-astro-cid-ctg3m53h": true })} </a> <button type="button" class="header__menu" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Ouvrir le menu" data-astro-cid-ctg3m53h> <span data-astro-cid-ctg3m53h></span> <span data-astro-cid-ctg3m53h></span> </button> <nav class="nav" id="site-nav" data-nav aria-label="Principale" data-astro-cid-ctg3m53h> ${navigation.map((item) => renderTemplate`<a${addAttribute(withBase(item.href), "href")} data-astro-cid-ctg3m53h>${item.label}</a>`)} <a class="btn btn-primary nav__cta-mobile"${addAttribute(withBase("/contact"), "href")} data-track-cta="header_cta_contact_mobile" data-track-label="Parler du signal" data-astro-cid-ctg3m53h>
Parler du signal
</a> </nav> <a class="btn btn-primary header__cta"${addAttribute(withBase("/contact"), "href")} data-track-cta="header_cta_contact" data-track-label="Parler du signal" data-astro-cid-ctg3m53h>
Parler du signal
</a> </div> </header> ${renderScript($$result, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/SiteHeader.astro?astro&type=script&index=0&lang.ts")}  `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/SiteHeader.astro", void 0);

const $$SiteFooter = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<footer class="footer" data-astro-cid-gcn2mc3v> <div class="wrap footer__inner" data-astro-cid-gcn2mc3v> <div class="footer__brand-block" data-astro-cid-gcn2mc3v> <a class="footer__logo"${addAttribute(withBase("/"), "href")} data-track-cta="footer_logo_home" data-track-label="Studio Jannah" data-astro-cid-gcn2mc3v> ${renderComponent($$result, "Logo", $$Logo, { "variant": "full", "size": 32, "inverted": true, "data-astro-cid-gcn2mc3v": true })} </a> <p class="footer__tag" data-astro-cid-gcn2mc3v>${site.tagline} — signature ${site.expert.name}</p> </div> <div class="footer__links" data-astro-cid-gcn2mc3v> <a${addAttribute(withBase("/go/malt"), "href")} data-track-cta="footer_malt" data-track-label="Malt" data-astro-cid-gcn2mc3v>Malt</a> <a${addAttribute(withBase("/go/linkedin"), "href")} data-track-cta="footer_linkedin" data-track-label="LinkedIn" data-astro-cid-gcn2mc3v>LinkedIn</a> <a${addAttribute(withBase("/mag"), "href")} data-track-cta="footer_mag" data-track-label="Le Mag" data-astro-cid-gcn2mc3v>Le Mag</a> <a${addAttribute(withBase("/use-cases"), "href")} data-track-cta="footer_usecases" data-track-label="Use cases" data-astro-cid-gcn2mc3v>Use cases</a> <a${addAttribute(withBase("/ao"), "href")} data-track-cta="footer_ao" data-track-label="AO" data-astro-cid-gcn2mc3v>Réponses AO</a> <a${addAttribute(withBase("/app"), "href")} data-track-cta="footer_app" data-track-label="App démo" data-astro-cid-gcn2mc3v>App démo</a> <a${addAttribute(withBase("/contact"), "href")} data-track-cta="footer_contact" data-track-label="Contact" data-astro-cid-gcn2mc3v>Contact</a> </div> </div> <div class="wrap footer__legal" data-astro-cid-gcn2mc3v> <span data-astro-cid-gcn2mc3v>© ${(/* @__PURE__ */ new Date()).getFullYear()} ${site.name}</span> <a${addAttribute(withBase("/politique-confidentialite"), "href")} data-astro-cid-gcn2mc3v>Confidentialité</a> <a href="#cookies" data-open-cmp data-track-cta="footer_cmp" data-track-label="Cookies" data-astro-cid-gcn2mc3v>Cookies</a> </div> </footer> `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/SiteFooter.astro", void 0);

var __freeze$3 = Object.freeze;
var __defProp$3 = Object.defineProperty;
var __template$3 = (cooked, raw) => __freeze$3(__defProp$3(cooked, "raw", { value: __freeze$3(cooked.slice()) }));
var _a$3;
const $$Astro$2 = createAstro("https://atrari-pro.github.io/studio-jannah");
const $$ConsentBoot = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ConsentBoot;
  const { privacyUrl = "/politique-confidentialite" } = Astro2.props;
  const gtmId = "GTM-KB54PFTP";
  const privacyHref = withBase(privacyUrl);
  const tacCss = withBase("/tarteaucitron/css/tarteaucitron.css");
  const cmpCss = withBase("/styles/cmp-jannah.css");
  const tacJs = withBase("/tarteaucitron/tarteaucitron.js");
  return renderTemplate(_a$3 || (_a$3 = __template$3(['<!-- Consent Mode v2 — push Arguments dans le dataLayer EXISTANT (jamais de reset) --><script>\n  (function () {\n    if (!Array.isArray(window.dataLayer)) window.dataLayer = [];\n    function gtag() {\n      window.dataLayer.push(arguments);\n    }\n    window.gtag = window.gtag || gtag;\n    gtag("consent", "default", {\n      ad_storage: "denied",\n      ad_user_data: "denied",\n      ad_personalization: "denied",\n      analytics_storage: "denied",\n      functionality_storage: "granted",\n      personalization_storage: "denied",\n      security_storage: "granted",\n      wait_for_update: 500,\n    });\n  })();\n</script> <link rel="stylesheet"', '><link rel="stylesheet"', "><script", "", "", "", '></script><script>\n  (function () {\n    var marker = document.querySelector("script[data-tac]");\n    var privacyUrl =\n      (marker && marker.getAttribute("data-privacy")) || "/politique-confidentialite";\n    var gtmId = (marker && marker.getAttribute("data-gtm")) || "";\n\n    function dl() {\n      if (window.sj && window.sj.ensureDataLayer) return window.sj.ensureDataLayer();\n      if (!Array.isArray(window.dataLayer)) window.dataLayer = [];\n      return window.dataLayer;\n    }\n\n    if (typeof tarteaucitron === "undefined") {\n      console.warn("[Studio Jannah] tarteaucitron non chargé — pnpm sync:cmp");\n      return;\n    }\n\n    tarteaucitron.init({\n      privacyUrl: privacyUrl,\n      bodyPosition: "top",\n      hashtag: "#cookies",\n      cookieName: "sj_consent",\n      orientation: "middle",\n      groupServices: true,\n      showDetailsOnClick: true,\n      serviceDefaultState: "wait",\n      showAlertSmall: false,\n      cookieslist: true,\n      closePopup: false,\n      showIcon: true,\n      iconPosition: "BottomLeft",\n      adblocker: false,\n      DenyAllCta: true,\n      AcceptAllCta: true,\n      highPrivacy: true,\n      alwaysNeedConsent: false,\n      handleBrowserDNTRequest: false,\n      removeCredit: false,\n      moreInfoLink: true,\n      useExternalCss: true,\n      useExternalJs: false,\n      readmoreLink: privacyUrl,\n      mandatory: true,\n      mandatoryCta: true,\n      googleConsentMode: true,\n      bingConsentMode: true,\n      pianoConsentMode: true,\n      softConsentMode: false,\n      dataLayer: true,\n      serverSide: false,\n      partnersList: false,\n    });\n\n    tarteaucitron.services.sjanalytics = {\n      key: "sjanalytics",\n      type: "analytic",\n      name: "Mesure Studio Jannah (dataLayer)",\n      needConsent: true,\n      cookies: ["sj_consent"],\n      readmoreLink: privacyUrl,\n      js: function () {\n        if (window.sj && window.sj.setConsent) {\n          window.sj.setConsent(true, false, "tarteaucitron_sjanalytics");\n        } else {\n          dl().push({\n            event: "sj_consent_update",\n            consent_analytics: true,\n            consent_source: "tarteaucitron_sjanalytics_fallback",\n            event_ts: Date.now(),\n            schema_version: "1.0.0",\n            brand: "studio_jannah",\n          });\n        }\n      },\n      fallback: function () {},\n    };\n    (tarteaucitron.job = tarteaucitron.job || []).push("sjanalytics");\n\n    if (window.sj && window.sj.push) {\n      window.sj.push({\n        event: "sj_cmp_ready",\n        cmp_name: "tarteaucitron",\n        cmp_id: "sj_consent",\n      });\n    } else {\n      dl().push({\n        event: "sj_cmp_ready",\n        cmp_name: "tarteaucitron",\n        cmp_id: "sj_consent",\n        event_ts: Date.now(),\n        schema_version: "1.0.0",\n        brand: "studio_jannah",\n      });\n    }\n\n    if (gtmId) {\n      tarteaucitron.user.googletagmanagerId = gtmId;\n      (tarteaucitron.job = tarteaucitron.job || []).push("googletagmanager");\n    }\n\n    document.addEventListener(\n      "click",\n      function (e) {\n        var el = e.target && e.target.closest ? e.target.closest("[data-open-cmp]") : null;\n        if (!el) return;\n        e.preventDefault();\n        if (tarteaucitron && tarteaucitron.userInterface) {\n          tarteaucitron.userInterface.openPanel();\n        }\n      },\n      false,\n    );\n  })();\n</script>'])), addAttribute(tacCss, "href"), addAttribute(cmpCss, "href"), addAttribute(tacJs, "src"), addAttribute(privacyHref, "data-privacy"), addAttribute(gtmId, "data-gtm"), addAttribute(tacJs, "data-tac"));
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/ConsentBoot.astro", void 0);

var __freeze$2 = Object.freeze;
var __defProp$2 = Object.defineProperty;
var __template$2 = (cooked, raw) => __freeze$2(__defProp$2(cooked, "raw", { value: __freeze$2(cooked.slice()) }));
var _a$2;
const $$Astro$1 = createAstro("https://atrari-pro.github.io/studio-jannah");
const $$TrackingBoot = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$TrackingBoot;
  const {
    pagePath,
    pageTitle,
    pageType = "other",
    contentGroup = "other"
  } = Astro2.props;
  return renderTemplate(_a$2 || (_a$2 = __template$2(["<script>(function(){", '\n  (function () {\n    function api() {\n      return window.sj;\n    }\n\n    function push(hit) {\n      if (api() && api().push) api().push(hit);\n      else if (window.sjTrack) window.sjTrack(hit);\n    }\n\n    if (api() && api().setContext) {\n      api().setContext({\n        page_path: pagePath,\n        page_title: pageTitle,\n        page_type: pageType,\n        content_group: contentGroup,\n        surface: "web",\n      });\n    }\n\n    // page_view une fois (d\xE9dup runtime) \u2014 mis en file si pas encore de consent\n    push({\n      event: "sj_page_view",\n      page_path: pagePath,\n      page_title: pageTitle,\n      page_type: pageType,\n      content_group: contentGroup,\n      surface: "web",\n    });\n\n    document.addEventListener(\n      "click",\n      function (e) {\n        var t = e.target;\n        if (!t || !t.closest) return;\n\n        var cta = t.closest("[data-track-cta]");\n        if (cta) {\n          var ctaId = cta.getAttribute("data-track-cta") || "unknown_cta";\n          var zone = ctaId.split("_")[0] || "unknown";\n          push({\n            event: "sj_cta_click",\n            cta_id: ctaId,\n            cta_label: (cta.getAttribute("data-track-label") || cta.textContent || "")\n              .trim()\n              .slice(0, 120),\n            cta_zone: zone,\n            page_path: pagePath,\n            page_type: pageType,\n            content_group: contentGroup,\n          });\n        }\n\n        var a = t.closest("a[href]");\n        if (a && a.href) {\n          try {\n            var url = new URL(a.href, location.href);\n            if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) {\n              push({\n                event: "sj_outbound_click",\n                link_url: url.href,\n                link_domain: url.hostname,\n                page_path: pagePath,\n                page_type: pageType,\n                content_group: contentGroup,\n              });\n            }\n          } catch (err) {}\n        }\n      },\n      true,\n    );\n\n    var depths = [25, 50, 75, 90, 100];\n    function onScroll() {\n      var h = document.documentElement;\n      var max = h.scrollHeight - h.clientHeight;\n      if (max <= 0) return;\n      var pct = Math.round((h.scrollTop / max) * 100);\n      depths.forEach(function (d) {\n        if (pct >= d) {\n          push({\n            event: "sj_scroll_depth",\n            scroll_percent: d,\n            page_path: pagePath,\n            page_type: pageType,\n            content_group: contentGroup,\n          });\n        }\n      });\n    }\n    window.addEventListener("scroll", onScroll, { passive: true });\n  })();\n})();<\/script>'])), defineScriptVars({ pagePath, pageTitle, pageType, contentGroup }));
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/TrackingBoot.astro", void 0);

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$RevealBoot = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a$1 || (_a$1 = __template$1(['<script>\n  (function () {\n    try {\n      if (!document.documentElement.classList.contains("sj-motion")) return;\n\n      var nodes = document.querySelectorAll(".sj-reveal");\n      if (!nodes.length) return;\n\n      if (!("IntersectionObserver" in window)) {\n        nodes.forEach(function (el) {\n          el.classList.add("is-in");\n        });\n        return;\n      }\n\n      var io = new IntersectionObserver(\n        function (entries) {\n          entries.forEach(function (entry) {\n            if (!entry.isIntersecting) return;\n            entry.target.classList.add("is-in");\n            io.unobserve(entry.target);\n          });\n        },\n        { rootMargin: "0px 0px -4% 0px", threshold: 0.08 }\n      );\n\n      nodes.forEach(function (el) {\n        io.observe(el);\n      });\n    } catch (_) {}\n  })();\n<\/script>'])));
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/RevealBoot.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://atrari-pro.github.io/studio-jannah");
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const {
    title = `${site.name} \u2014 ${site.tagline}`,
    description = "Studio d'expertise mesure marketing, tracking, CRO et data/IA \u2014 Studio Jannah.",
    path = "/",
    pageType = "other",
    contentGroup = "other"
  } = Astro2.props;
  const canonical = new URL(path.replace(/^\//, ""), Astro2.site).toString();
  const asset = (p) => withBase(p);
  return renderTemplate(_a || (_a = __template(['<html lang="fr"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>', '</title><meta name="description"', '><link rel="canonical"', '><meta name="theme-color" content="#0c1412"><!-- Data Layer runtime FIRST \u2014 ne pas d\xE9placer --><script', '><\/script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet"><link rel="llms"', '><script>\n      try {\n        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {\n          document.documentElement.classList.add("sj-motion");\n        }\n      } catch (e) {}\n    <\/script>', "", "", '</head> <body> <a class="skip-link" href="#main">Aller au contenu</a> ', ' <main id="main"> ', " </main> ", " ", " ", " </body></html>"])), title, addAttribute(description, "content"), addAttribute(canonical, "href"), addAttribute(asset("/sj/datalayer.js"), "src"), addAttribute(asset("/llms.txt"), "href"), renderComponent($$result, "ConsentBoot", $$ConsentBoot, {}), renderSlot($$result, $$slots["head"]), renderHead(), renderComponent($$result, "SiteHeader", $$SiteHeader, {}), renderSlot($$result, $$slots["default"]), renderComponent($$result, "SiteFooter", $$SiteFooter, {}), renderComponent($$result, "TrackingBoot", $$TrackingBoot, { "pagePath": path, "pageTitle": title, "pageType": pageType, "contentGroup": contentGroup }), renderComponent($$result, "RevealBoot", $$RevealBoot, {}));
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/layouts/BaseLayout.astro", void 0);

export { $$BaseLayout as $, $$Logo as a, brands as b, capabilities as c, missions as d, methodSteps as m, site as s, withBase as w };
