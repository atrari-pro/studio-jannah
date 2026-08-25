/**
 * Studio Jannah — site config & content flags
 * Remplacer progressivement les placeholders listés dans content/placeholders.md
 */

export const site = {
  name: "Studio Jannah",
  tagline: "L'atelier du signal",
  magazine: {
    name: "Jannah Mag",
    headline: "Le mag du signal",
    tagline:
      "Petite encyclopédie du signal — textes et vidéos. Trafic, métiers, produits, toujours ramenés à la mesure.",
  },
  expert: {
    name: "Mohamed Atrari",
    role: "Data & AI Engineer — tracking, analytics & CRO",
    years: 9,
    line: "Je connecte la donnée digitale à la décision business — du delivery terrain à la conception d’agents IA pour les équipes marketing.",
  },
  url: "https://atrari-pro.github.io/studio-jannah", // Pages ; domaine custom plus tard
  locale: "fr-FR",
  features: {
    magazine: true,
    ao: true,
    goLandings: true,
    appDemo: false,
  },
} as const;

export const navigation = [
  { href: "/#expertises", label: "Métier" },
  { href: "/#missions", label: "Missions" },
  { href: "/mag", label: "Le Mag" },
  { href: "/contact", label: "Contact" },
] as const;

/** Rubriques Mag — un nouvel article choisit l’une d’elles. */
export const magRubriques = [
  { id: "mesure", label: "Mesure" },
  { id: "trafic", label: "Trafic" },
  { id: "metiers", label: "Métiers" },
  { id: "produits", label: "Produits" },
  { id: "agents", label: "Agents" },
] as const;

export type MagRubriqueId = (typeof magRubriques)[number]["id"];
export type MagFormat = "text" | "video";

/**
 * Comptes d’intervention en salarié (pas des clients Studio Jannah).
 * fifty-five : mai 2021 – avr. 2022 · EY : oct. 2022 – aujourd’hui
 * Noms : à valider vs contrat / NDA / politique interne.
 */
export const employerScopes = [
  {
    id: "fifty-five",
    name: "fifty-five",
    period: "2021–2022",
    role: "Tracking Specialist",
    text: "Cœur de métier : plan de marquage et dataLayer, setup TMS, QA technique. Recette en preview GTM (ou autre TMS), parfois injection de script (ex. Commanders Act). Vérif des hits navigateur, objets hors dataLayer, puis contrôle dans GA4 (et équivalents) + config propriété.",
  },
  {
    id: "ey",
    name: "EY",
    period: "2022–aujourd’hui",
    role: "Senior — Analytics & CRO",
    text: "Marketing, Sales and Service Transformation : delivery tracking / sGTM, dashboards, CRO, posture conseil (diagnostic, roadmap, Product Owner data), enablement, et montée agentique (outils / agents métier).",
  },
] as const;

export const brands = [
  {
    id: "richemont",
    name: "Richemont",
    sector: "Luxe",
    via: "fifty-five",
    note: "Maisons Cartier, Montblanc, Vacheron Constantin — plan de marquage / dataLayer multi-marques, setup TMS, QA preview et hits, recette GA4.",
  },
  {
    id: "danone",
    name: "Danone",
    sector: "Agroalimentaire",
    via: "fifty-five",
    note: "Plan de marquage, dataLayer, config TMS et QA (preview, hits, objets hors DL) — contrôle dans GA4 / stack analytics.",
  },
  {
    id: "axa",
    name: "AXA",
    sector: "Assurance",
    via: "fifty-five",
    note: "Spécification dataLayer, implémentation TMS, tests techniques et recette hits / propriété analytics.",
  },
  {
    id: "arval",
    name: "Arval",
    sector: "Auto / finance",
    via: "fifty-five",
    note: "Plan de taggage, QA TMS (preview ou injection) et vérif navigateur + GA4 — groupe BNP Paribas.",
  },
  {
    id: "sodexo",
    name: "Sodexo",
    sector: "Services",
    via: "fifty-five",
    note: "Marquage, setup TMS, recette technique des hits et alignement config analytics.",
  },
  {
    id: "biocodex",
    name: "Biocodex",
    sector: "Santé",
    via: "fifty-five",
    note: "Plan de marquage / dataLayer, QA TMS et contrôle des hits dans les outils analytics.",
  },
  {
    id: "tv5monde",
    name: "TV5 Monde",
    sector: "Médias",
    via: "fifty-five",
    note: "Collecte, TMS, QA navigateur (hits, objets hors dataLayer) et recette côté GA4 / équivalent.",
  },
  {
    id: "belron",
    name: "Belron",
    sector: "Services",
    via: "EY",
    note: "Autonomie delivery : mesure, dashboards, insights et dialogue international — au-delà du seul tagging.",
  },
  {
    id: "carglass",
    name: "Carglass.fr",
    sector: "Services",
    via: "EY",
    note: "Tracking + CRO : parcours, frictions, hypothèses de test, restitution Product / marketing.",
  },
  {
    id: "eni",
    name: "ENI Plenitude",
    sector: "Énergie",
    via: "EY",
    note: "Cycle plus large : diagnostic, taggage, dataviz, reco d’expérimentation, enablement équipes.",
  },
  {
    id: "jja",
    name: "JJA",
    sector: "Retail",
    via: "EY",
    note: "Ownership mesure / CRO : backlog, arbitrages stakeholders, delivery et montée en compétence.",
  },
  {
    id: "leclerc",
    name: "E.Leclerc",
    sector: "Retail",
    via: "EY",
    note: "Analytics & expérimentation — dashboards, taggage, synthèses A/B auprès du management et des BU.",
  },
  {
    id: "orange",
    name: "Orange",
    sector: "Télécom",
    via: "EY",
    note: "Environnement complexe : tracking (dont server-side), analyses ad hoc, gouvernance du signal.",
  },
  {
    id: "paylib",
    name: "Paylib",
    sector: "Paiement",
    via: "EY",
    note: "Parcours paiement : mesure, réconciliation du signal, stack TMS / analytics en autonomie.",
  },
] as const;

export const capabilities = [
  {
    id: "collecte",
    title: "Collecte",
    discipline: "Tracking",
    summary:
      "Un signal faux à la source reste faux jusqu’au dashboard. Plan de marquage, dataLayer, TMS client et server-side, SDK mobile, CMP — construits from scratch, migrés, ou repris sur un existant qui fuit.",
    delivers:
      "PDM à jour, implémentation recettée (Preview, hits, Consent Mode), documentation qui survit au projet.",
    stack: ["GTM / sGTM", "Adobe Launch", "CommandersAct", "Firebase", "CMP"],
    points: ["Création from scratch", "Migration UA → GA4 / sGTM", "Data quality multi-container"],
  },
  {
    id: "mesure",
    title: "Mesure",
    discipline: "Analytics & data",
    summary:
      "Un chiffre isolé ne prouve rien : il n’est validé qu’après croisement de sources. Paramétrage analytics, dashboards, BigQuery, funnels — transformer la collecte en lecture qui tient, pas en tableau de plus.",
    delivers:
      "Propriétés cadrées, reporting qui tient sous question, lectures funnel actionnables.",
    stack: ["GA4", "Piano", "Matomo", "Adobe Analytics", "BigQuery", "Looker / Power BI"],
    points: ["Dashboarding", "Funnel & drop", "Réconciliation analytics ↔ data"],
  },
  {
    id: "activation",
    title: "Activation",
    discipline: "CRO & attribution",
    summary:
      "Une hypothèse non testée n’est qu’une opinion. Audits CRO, A/B, attribution, tags média, API de conversion — la décision vient après le test, jamais avant.",
    delivers:
      "Hypothèses priorisées et documentées, campagnes de test cadrées, lectures partagées Product / marketing / media.",
    stack: ["Contentsquare", "Optimizely", "Adobe Target", "Meta CAPI", "Google Ads API"],
    points: ["Journey & session replay", "A/B & MVT", "Attribution & conversion APIs"],
  },
  {
    id: "conseil",
    title: "Conseil & diagnostic",
    discipline: "Stratégie & gouvernance",
    summary:
      "Décider où investir avant de builder — pas l’inverse. Audit d’environnement, roadmap, quick wins vs structurants, conformité cookieless / CMP : posture conseil jusqu’au Product Owner data.",
    delivers:
      "Diagnostic écrit, plan d’action mesurable, arbitrages tranchés avec les stakeholders.",
    stack: ["Didomi", "OneTrust", "Trust Commander", "Miro", "Jira"],
    points: ["Audit & maturité", "Roadmap ROI", "Gouvernance & RGPD"],
  },
  {
    id: "automatisation",
    title: "Automatisation",
    discipline: "Agentic AI",
    summary:
      "Un script qui tourne seul n’est pas un agent. Transformer tâches et scripts en outils utilisables par le métier — human-in-the-loop : on n’automatise bien que ce qu’on a d’abord fait à la main.",
    delivers:
      "Apps métier, agents tool-use, orchestration multi-source (SEA / SEO / GEO).",
    stack: ["Cursor", "Claude", "Python", "FastAPI", "Cloud Run", "Streamlit"],
    points: ["Vibe coding → produit", "Agents API (ex. Google Ads)", "Contrôle humain avant action"],
  },
  {
    id: "enablement",
    title: "Enablement",
    discipline: "Transverse",
    summary:
      "Laisser une capacité, pas une dépendance. Formation, process, documentation, mentorat — chaque mission se termine par une équipe plus autonome.",
    delivers:
      "Guides, rituels de recette, montée en compétence analytics / tracking.",
    stack: ["GA4", "Piano", "Contentsquare", "Confluence"],
    points: ["Formation équipes", "Runbooks & tickets", "Mentorat data web"],
  },
] as const;

/**
 * Missions — mandats types (données évolutives).
 * durée / terrain / aim = illustratifs (voir placeholders.md)
 */
export const missions = [
  {
    id: "audit",
    title: "Diagnostic d’environnement",
    mode: "Ponctuel",
    text: "Maturité collecte / mesure / activation : où le signal fuit, où le consentement bloque, où le métier et l’analytics divergent. Prioriser avant de reconstruire.",
    duration: "2–4 semaines",
    terrain: "Multi-secteurs",
    aim: "Cartographie des gaps, quick wins vs structurants, feuille de route.",
    stack: ["TMS", "GA4 / Piano", "CMP"],
  },
  {
    id: "collecte",
    title: "Création ou migration de collecte",
    mode: "Ponctuel",
    text: "PDM, dataLayer, GTM client ou server-side, Firebase. Ou migration UA → GA4 / client → sGTM — avec recette croisée et continuité des identifiants.",
    duration: "3–6 semaines",
    terrain: "Retail · services · télécom",
    aim: "Collecte recettée, Consent Mode aligné, runbook équipes.",
    stack: ["GTM / sGTM", "GA4", "CMP"],
  },
  {
    id: "mesure",
    title: "Mesure & reporting fiable",
    mode: "Fil rouge",
    text: "Paramétrage analytics, dashboards Looker / Power BI, modélisation BigQuery. Croisement systématique de sources avant de valider un chiffre.",
    duration: "4–10 semaines",
    terrain: "Énergie · distribution",
    aim: "Reporting pilotable, lectures funnel actionnables.",
    stack: ["GA4", "BigQuery", "Looker Studio"],
  },
  {
    id: "cro",
    title: "CRO & expérimentation",
    mode: "Fil rouge",
    text: "Audits parcours (Contentsquare), hypothèses, A/B (Optimizely / Adobe Target). Significativité et segmentation avant toute conclusion.",
    duration: "8–12 semaines",
    terrain: "Luxe · retail",
    aim: "Backlog priorisé, tests lus, décisions Product / marketing.",
    stack: ["Contentsquare", "Optimizely", "Adobe Target"],
  },
  {
    id: "recon",
    title: "Réconciliation & attribution",
    mode: "Ponctuel",
    text: "Paiement hors domaine, iframe, CRM, media APIs : reconstruire une chaîne de vérité et cadrer attribution / conversion APIs.",
    duration: "3–6 semaines",
    terrain: "Finance · paiement · media",
    aim: "Référentiel métier ↔ analytics ↔ ads partagé.",
    stack: ["PSP", "BigQuery", "Meta CAPI", "Google Ads"],
  },
  {
    id: "agents",
    title: "Agents & outils métier",
    mode: "Fil rouge",
    text: "Passer de scripts à des apps / agents (Cursor, Claude) : wizard Google Ads, orchestration SEA/SEO/GEO — toujours avec point de contrôle humain.",
    duration: "4–10 semaines",
    terrain: "Media · marketing ops",
    aim: "Outil en prod, hébergé, utilisable en autonomie supervisée.",
    stack: ["Cursor", "Claude", "Cloud Run", "FastAPI"],
  },
] as const;

export const methodSteps = [
  {
    n: "01",
    title: "Collecter",
    text: "Fiabiliser la source : PDM, TMS, sGTM, CMP. Sans collecte saine, le reste est du théâtre.",
  },
  {
    n: "02",
    title: "Mesurer",
    text: "Lire et réconcilier : analytics, BigQuery, dashboards. Croiser les sources avant de décider.",
  },
  {
    n: "03",
    title: "Activer",
    text: "CRO, A/B, attribution, media APIs — des actions sur un signal qu’on peut croire.",
  },
  {
    n: "04",
    title: "Automatiser",
    text: "Agents et outils métier, human-in-the-loop. On automatise ce qu’on a d’abord maîtrisé à la main.",
  },
] as const;
