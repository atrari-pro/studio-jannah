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
      "Ton magazine d’articles — tendances trafic, métiers digitaux, produits — toujours ramenés à la mesure. Esprit Semrush, signature Studio Jannah.",
  },
  expert: {
    name: "Mohamed Atrari",
    role: "Data Marketing Analytics Engineer",
    years: 8,
  },
  url: "https://atrari-pro.github.io/studio-jannah", // Pages ; domaine custom plus tard
  locale: "fr-FR",
  features: {
    magazine: true,
    ao: true,
    goLandings: true,
    appDemo: true,
  },
} as const;

export const navigation = [
  { href: "/#expertises", label: "Expertises" },
  { href: "/#missions", label: "Missions" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/mag", label: "Le Mag" },
  { href: "/contact", label: "Contact" },
] as const;

/** Marques fictives — à remplacer par de vraies références */
export const brands = [
  {
    id: "nordline",
    name: "Nordline Energy",
    sector: "Énergie",
    note: "Réconciliation leads ↔ analytics sur parcours multi-domaines.",
  },
  {
    id: "atelier-or",
    name: "Atelier Or",
    sector: "Luxe / Retail",
    note: "Funnel checkout instrumenté, tests lus sur un signal propre.",
  },
  {
    id: "pulse-mobile",
    name: "Pulse Mobile",
    sector: "Télécom",
    note: "sGTM first-party et match rate ads sous contrainte CMP.",
  },
  {
    id: "clara-beauty",
    name: "Clara Beauty",
    sector: "Cosmétique",
    note: "Plan de taggage GA4 + recette pour équipes acquisition.",
  },
  {
    id: "glassfix",
    name: "Glassfix",
    sector: "Services",
    note: "Audit tracking / consentement avant refonte media.",
  },
  {
    id: "haven-bank",
    name: "Haven Bank",
    sector: "Finance",
    note: "Écart PSP ↔ CRM ↔ analytics sous le seuil métier.",
  },
] as const;

export const capabilities = [
  {
    id: "mesure",
    n: "01",
    title: "Mesure & tracking",
    anchor: "Fondation",
    summary:
      "Architectures de collecte fiables : GA4, Piano, TMS, server-side (sGTM), conformité CMP/RGPD.",
    points: ["Audit & plan de taggage", "sGTM / first-party", "CMP & Consent Mode"],
  },
  {
    id: "cro",
    n: "02",
    title: "CRO & expérimentation",
    anchor: "Conversion",
    summary:
      "Tests A/B, scoring, analyse UX — convertir mieux sans augmenter le budget média.",
    points: ["Hypothèses instrumentées", "A/B & feature flags", "Parcours & friction"],
  },
  {
    id: "data-stack",
    n: "03",
    title: "Data stack marketing",
    anchor: "Activation",
    summary:
      "BigQuery, dbt, pipelines et activation : de la donnée brute à la décision.",
    points: ["Pipelines & modèles", "Dashboards pilotables", "Réconciliation métier"],
  },
  {
    id: "ia",
    n: "04",
    title: "IA appliquée au marketing",
    anchor: "Quand le signal tient",
    summary:
      "Modèles et automatisations au service de l’attribution, du scoring et de l’activation — quand le signal le justifie.",
    points: ["Scoring & priorisation", "Activation ciblée", "Garde-fous mesure"],
  },
] as const;

/**
 * Missions types — style Fabre « missions fréquentes », ton Jannah
 * Champs durée / secteur / outcome / stack = fictifs illustratifs (voir placeholders.md)
 */
export const missions = [
  {
    n: "01",
    title: "Audit tracking & conformité",
    text: "Cartographier les trous de collecte, le consentement et l’écart analytics vs métier.",
    format: "One-shot",
    duration: "2–3 sem.",
    sector: "Retail / e-com",
    outcome: "+18 pts couverture events clés",
    stack: ["GA4", "CMP", "GTM"],
  },
  {
    n: "02",
    title: "Setup GA4 / Piano & TMS",
    text: "Plan de taggage, implémentation, recette et documentation exploitable par les équipes.",
    format: "One-shot",
    duration: "3–5 sem.",
    sector: "Services B2B",
    outcome: "Plan de taggage + runbook livrés",
    stack: ["GA4", "Piano", "TMS"],
  },
  {
    n: "03",
    title: "Tracking server-side (sGTM)",
    text: "Renforcer les signaux utiles aux analyses et aux plateformes media, sans data leakage.",
    format: "Fil rouge",
    duration: "4–8 sem.",
    sector: "Télécom",
    outcome: "+22 % match rate ads (fictif)",
    stack: ["sGTM", "first-party", "Consent Mode"],
  },
  {
    n: "04",
    title: "CRO & expérimentation",
    text: "Instrumenter le funnel, prioriser les tests, lire des résultats sur un signal fiable.",
    format: "Fil rouge",
    duration: "8–12 sem.",
    sector: "Luxe / Retail",
    outcome: "+0,9 pt CVR checkout (fictif)",
    stack: ["A/B", "feature flags", "funnel"],
  },
  {
    n: "05",
    title: "Réconciliation & attribution",
    text: "Relier PSP, CRM et analytics quand le parcours sort du domaine (paiement, offline).",
    format: "One-shot",
    duration: "3–6 sem.",
    sector: "Finance",
    outcome: "Écart PSP ↔ analytics < 3 %",
    stack: ["PSP", "BigQuery", "CRM"],
  },
  {
    n: "06",
    title: "Data stack & activation IA",
    text: "Pipelines, features et modèles — seulement quand la mesure de base tient la route.",
    format: "Fil rouge",
    duration: "6–10 sem.",
    sector: "Énergie",
    outcome: "Scoring lead en prod (garde-fous)",
    stack: ["dbt", "BQ", "scoring"],
  },
] as const;

export const methodSteps = [
  {
    n: "01",
    title: "Diagnostiquer le signal",
    text: "Audit de collecte, écarts métier vs analytics, priorisation par impact business.",
  },
  {
    n: "02",
    title: "Fiabiliser la mesure",
    text: "Plan de taggage, sGTM, consentement, documentation — données actionnables.",
  },
  {
    n: "03",
    title: "Activer & apprendre",
    text: "CRO, dashboards, attribution, IA ciblée — itérer sur des métriques fiables.",
  },
] as const;
