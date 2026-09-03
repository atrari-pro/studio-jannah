import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { marked } from "marked";
import {
  CalendarDays,
  CircleCheck,
  FolderKanban,
  GanttChartSquare,
  ListTodo,
  Mail,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { getSupabase } from "./lib/supabase";
import { MigrationSimulator } from "./MigrationSimulator";

// --- Types -----------------------------------------------------------

type Lead = {
  id: string;
  name: string;
  email: string;
  message: string;
  page_path: string | null;
  created_at: string;
  status: string | null;
  notes: string | null;
  project: string | null;
};

type VeilleItem = {
  id: string;
  source: string;
  title: string;
  link: string;
  summary: string | null;
  published_at: string | null;
  fetched_at: string;
  status: string;
  relevance: "pertinent" | "hors_scope" | null;
  relevance_reason: string | null;
};

// pertinent d'abord, non jugé ensuite, hors_scope en dernier — c'est ce qui
// intéresse le moins dans ce tri (à vérifier au cas où le filtre se trompe,
// mais pas la priorité de lecture).
const RELEVANCE_ORDER: Record<string, number> = { pertinent: 0, hors_scope: 2 };
function relevanceRank(item: VeilleItem): number {
  return item.relevance ? RELEVANCE_ORDER[item.relevance] : 1;
}

const DEFAULT_VEILLE_FEED = "https://www.searchenginejournal.com/feed/";

// --- Tâches (ponctuel) --------------------------------------------------

type Task = {
  id: string;
  project: string;
  title: string;
  start_date: string;
  end_date: string;
  status: "a_faire" | "en_cours" | "fait";
  notes: string | null;
  created_at: string;
  // Catégorisation libre (refonte Planning) : texte défini par l'utilisateur,
  // pas d'enum — voir supabase/tasks.sql. null/vide = pas catégorisée.
  category: string | null;
};

// Accent couleur déterministe par catégorie — hash du nom vers une teinte
// choisie dans une palette fermée, pas un hue HSL continu (0-360° tombait
// dans le rouge selon le nom tapé, hors charte — pas de rouge dans Studio
// Jannah). Palette fermée = pas de table à maintenir par catégorie (toujours
// libre/non bornée), mais garantit de rester dans la famille pierre
// froide/vert/or.
const CATEGORY_PALETTE = [
  "var(--sj-garden-bright)",
  "var(--sj-signal)",
  "#3d8fa6", // bleu ardoise
  "#6b9e78", // sauge
  "#a67c3d", // ambre
  "#4a6b8a", // bleu nuit
  "#7d8c4a", // olive
  "var(--sj-garden)",
];

function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

const TASK_STATUSES: Task["status"][] = ["a_faire", "en_cours", "fait"];
const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};

// Un projet est le point d'entrée réel : "fait" le marque livré, peu importe
// le détail des tâches qui le composent (voir supabase/projects.sql pour le
// pourquoi de cette table séparée, liée par nom).
type Project = {
  id: string;
  name: string;
  status: "actif" | "pause" | "fait" | "abandonne";
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

const PROJECT_STATUSES: Project["status"][] = ["actif", "pause", "fait", "abandonne"];
const PROJECT_STATUS_LABEL: Record<Project["status"], string> = {
  actif: "Actif",
  pause: "En pause",
  fait: "Fait",
  abandonne: "Abandonné",
};
// --- Suivi (pur, sans score/jugement) -----------------------------------
// Refonte Planning : plus de % avance/à jour/retard ni de statut de "santé"
// projet — juste des faits comptés (tâches en retard, série de jours
// pointés). Le lecteur juge lui-même, l'admin ne note plus rien.

// Nombre de tâches non faites dont l'échéance est passée — un compte,
// jamais un statut coloré/jugé.
function countLateTasks(tasks: Task[], today: string): number {
  return tasks.filter((t) => t.status !== "fait" && t.end_date < today).length;
}

// Date locale en YYYY-MM-DD — jamais .toISOString() ici : elle convertit en
// UTC, ce qui décale la date near-minuit selon le fuseau (ex. 1h du matin en
// France = veille en UTC). Sensible partout où on compare à "aujourd'hui"
// (pointage quotidien, jours futurs désactivés, bornes de mois).
function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO(): string {
  return toLocalISODate(new Date());
}

// Affichage — jamais la date ISO brute (YYYY-MM-DD) dans l'UI, seulement
// pour le stockage/comparaisons. `d` reste au format YYYY-MM-DD ici (pas de
// composant horaire), donc parsée en local pour éviter tout décalage UTC.
function formatDateFR(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

type ContentForm = {
  type: "" | "insight" | "use-case";
  rubrique: string;
  format: "texte" | "vidéo";
  videoSrc: string;
  videoCaption: string;
  sector: string;
  complexity: string;
  content: string;
  sources: string;
  featured: boolean;
};

const EMPTY_FORM: ContentForm = {
  type: "",
  rubrique: "",
  format: "texte",
  videoSrc: "",
  videoCaption: "",
  sector: "",
  complexity: "",
  content: "",
  sources: "",
  featured: false,
};

const RUBRIQUES = ["mesure", "trafic", "metiers", "produits", "agents"];
const COMPLEXITES = ["medium", "high", "expert"];
const LEAD_STATUSES = ["nouveau", "contacté", "qualifié", "perdu", "gagné"];

// Pas de rouge dans la palette Studio Jannah (vert/or uniquement) — "perdu"
// se distingue par l'atténuation plutôt que par une couleur d'alerte.
const LEAD_STATUS_DOT: Record<string, string> = {
  nouveau: "var(--sj-signal)",
  contacté: "color-mix(in oklab, var(--sj-paper) 55%, transparent)",
  qualifié: "var(--sj-garden-bright)",
  perdu: "color-mix(in oklab, var(--sj-paper) 20%, transparent)",
  gagné: "var(--sj-garden-bright)",
};

function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

// "Répondre via mon gmail" — ouvre le compose web Gmail plutôt qu'un
// mailto: (qui dépend du client mail par défaut de l'OS, pas forcément Gmail).
function gmailComposeUrl(lead: Lead): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: lead.email,
    su: "Re: votre message — Studio Jannah",
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

// --- Appel aux Edge Functions -----------------------------------------

async function callFunction(name: string, session: Session, init: RequestInit = {}) {
  const url = (import.meta.env.PUBLIC_SUPABASE_URL as string) + `/functions/v1/${name}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.access_token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${name} ${res.status}: ${await res.text()}`);
  return res.json();
}

// --- Racine admin --------------------------------------------------------

// Retour au site public : admin/ vit sous /app-demo/admin/ (voir base Vite),
// donc la racine est toujours deux niveaux au-dessus — relatif, indépendant
// du base path exact (GitHub Pages vs Capacitor).
const HOME_HREF = "../../";

export function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<
    "menu" | "veille" | "leads" | "content" | "drafts" | "published" | "simulateur" | "tracking-score" | "projects"
  >("menu");
  // Pré-remplissage du wizard "Publier un contenu" depuis un article de la
  // veille RSS (bouton "Générer un draft" dans Veille) — null quand on
  // arrive sur le wizard par le menu normal.
  const [contentPrefill, setContentPrefill] = useState<Partial<ContentForm> | null>(null);
  // Lien Leads → Projets ("Voir le projet") — consommé une fois côté enfant.
  // Les tâches ne sont pas un écran séparé : elles vivent dans la fiche du
  // projet (voir Projects), donc plus besoin de ce même focus pour elles.
  const [projectsFocus, setProjectsFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setSession(null);
      return;
    }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = () => getSupabase()?.auth.signOut();

  if (session === undefined) {
    return (
      <AdminShell>
        <main className="panel">
          <p className="eyebrow">Admin</p>
          <h1>Chargement…</h1>
        </main>
      </AdminShell>
    );
  }

  if (!session) {
    return (
      <AdminShell>
        <Login />
      </AdminShell>
    );
  }

  return (
    <AdminShell session={session} onLogout={logout} wide={view === "projects"}>
      {view === "menu" && (
        <Menu
          onPick={(v) => {
            if (v === "content") setContentPrefill(null);
            setView(v);
          }}
        />
      )}
      {view === "veille" && (
        <Veille
          session={session}
          onBack={() => setView("menu")}
          onGenerateDraft={(prefill) => {
            setContentPrefill(prefill);
            setView("content");
          }}
        />
      )}
      {view === "leads" && (
        <Leads
          session={session}
          onBack={() => setView("menu")}
          onViewProject={(project) => {
            setProjectsFocus(project);
            setView("projects");
          }}
        />
      )}
      {view === "drafts" && <Drafts session={session} onBack={() => setView("menu")} />}
      {view === "published" && <PublishedArticles session={session} onBack={() => setView("menu")} />}
      {view === "simulateur" && <MigrationSimulator onBack={() => setView("menu")} />}
      {view === "tracking-score" && <TrackingScoreInfo onBack={() => setView("menu")} />}
      {view === "content" && <Content session={session} onBack={() => setView("menu")} prefill={contentPrefill} />}
      {view === "projects" && (
        <Projects
          session={session}
          onBack={() => setView("menu")}
          initialProject={projectsFocus}
          onConsumeInitialProject={() => setProjectsFocus(undefined)}
        />
      )}
    </AdminShell>
  );
}

// --- Coquille : header persistant (retour site, session) -----------------

function AdminShell({
  session,
  onLogout,
  children,
  wide,
}: {
  session?: Session;
  onLogout?: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <header className="admin-header">
        <a className="admin-header__brand" href={HOME_HREF}>
          <span className="admin-header__mark" aria-hidden="true">
            ⌁
          </span>
          Studio Jannah
          <span className="admin-header__tag">Admin</span>
        </a>
        <div className="admin-header__right">
          {session && <span className="admin-header__email">{session.user.email}</span>}
          <a className="admin-header__logout" href={HOME_HREF} style={{ textDecoration: "none" }}>
            ← Site
          </a>
          {session && onLogout && (
            <button type="button" className="admin-header__logout" onClick={onLogout}>
              Se déconnecter
            </button>
          )}
        </div>
      </header>
      <div className={`admin-main${wide ? " admin-main--wide" : ""}`}>{children}</div>
    </>
  );
}

// --- Login -----------------------------------------------------------

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) {
      setError("Configuration Supabase manquante.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <main className="panel">
      <p className="eyebrow">Admin · Studio Jannah</p>
      <h1>Se connecter</h1>
      <form onSubmit={submit} className="options">
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          className="field"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "…" : "Entrer"}
        </button>
      </form>
    </main>
  );
}

// --- Menu --------------------------------------------------------------

const CONTENT_ITEMS = [
  {
    value: "veille",
    icon: "📡",
    title: "Veille RSS",
    text: "Récupérer les derniers articles d'un flux RSS, à trier avant publication.",
  },
  { value: "leads", icon: "📇", title: "Leads", text: "Voir, qualifier et annoter les demandes de contact." },
  { value: "content", icon: "✍️", title: "Publier un contenu", text: "Wizard insight / use case, généré puis relu avant PR." },
  { value: "drafts", icon: "📝", title: "Drafts en attente", text: "PR ouvertes depuis l'admin, à relire avant merge." },
  { value: "published", icon: "📚", title: "Articles publiés", text: "Éditer, dépublier ou supprimer du contenu en ligne." },
] as const;

// Un seul point d'entrée : la fiche d'un projet contient déjà ses tâches
// (jalons ponctuels, statut modifiable en ligne) — plus besoin de deviner où
// chercher, tout vit au même endroit, par projet.
const PLANNING_ITEMS = [
  {
    value: "projects",
    icon: "🗂️",
    title: "Projets",
    text: "Suivi des tâches, roadmap visuelle et vue du jour, organisé par projet.",
  },
] as const;

const TOOL_ITEMS = [
  {
    value: "simulateur",
    icon: "🧮",
    title: "Simulateur migration",
    text: "Chiffrage client-side → server-side, exportable.",
  },
  {
    value: "tracking-score",
    icon: "🎯",
    title: "Tracking Score",
    text: "Audit tracking/CMP d'un site tiers — outil desktop, à lancer en local.",
    external: true,
  },
] as const;

function Menu({
  onPick,
}: {
  onPick: (
    v: "veille" | "leads" | "content" | "drafts" | "published" | "simulateur" | "tracking-score" | "projects",
  ) => void;
}) {
  return (
    <main className="panel">
      <p className="eyebrow">Admin · Studio Jannah</p>
      <h1>Que veux-tu faire ?</h1>

      <p className="menu-section-label">Contenu &amp; leads</p>
      <div className="menu-grid" role="list">
        {CONTENT_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="menu-card"
            role="listitem"
            onClick={() => onPick(item.value)}
          >
            <span className="menu-card__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              <span className="menu-card__title">{item.title}</span>
              <p className="menu-card__text">{item.text}</p>
            </span>
          </button>
        ))}
      </div>

      <p className="menu-section-label">Planning</p>
      <div className="menu-grid" role="list">
        {PLANNING_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="menu-card"
            role="listitem"
            onClick={() => onPick(item.value)}
          >
            <span className="menu-card__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              <span className="menu-card__title">{item.title}</span>
              <p className="menu-card__text">{item.text}</p>
            </span>
          </button>
        ))}
      </div>

      <p className="menu-section-label">Outils</p>
      <div className="menu-grid" role="list">
        {TOOL_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`menu-card${"external" in item && item.external ? " menu-card--external" : ""}`}
            role="listitem"
            onClick={() => onPick(item.value)}
          >
            <span className="menu-card__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              <span className="menu-card__title">{item.title}</span>
              <p className="menu-card__text">{item.text}</p>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

// --- Tracking Score : pas un outil web (Electron + Playwright, fenêtre
// navigateur pilotée), donc pas de vue embarquée — juste ce qu'il faut pour
// le lancer et savoir à quoi s'attendre. Voir apps/tracking-score/README.md.

const TRACKING_SCORE_CMD = "pnpm dev:tracking-score";

function TrackingScoreInfo({ onBack }: { onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  function legacyCopy(text: string): boolean {
    // Fallback document.execCommand : la Clipboard API async peut être
    // refusée (contexte non focus, permission navigateur, iframe) sans que
    // ce soit un vrai bug — cette voie marche presque partout en retour.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  async function copyCmd() {
    // Course contre un court timeout : sur certains navigateurs/contextes,
    // la permission clipboard-write reste en attente indéfiniment au lieu
    // de résoudre ou rejeter — sans ça le bouton resterait bloqué sans
    // jamais retomber sur le fallback execCommand.
    let ok = false;
    try {
      await Promise.race([
        navigator.clipboard.writeText(TRACKING_SCORE_CMD),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 800)),
      ]);
      ok = true;
    } catch {
      ok = legacyCopy(TRACKING_SCORE_CMD);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <main className="panel">
      <p className="eyebrow">Outils · Tracking Score</p>
      <h1>Audit tracking d'un site</h1>
      <div className="tool-badges">
        <span className="tool-badge">v0.4 · CMP, TMS, Analytics, dataLayer, Perf</span>
      </div>
      <p style={{ marginBottom: "0.75rem" }}>
        Outil desktop (Electron + Playwright) : il ouvre une vraie fenêtre de navigateur sur le site à auditer, tu
        acceptes/refuses les cookies toi-même, puis il génère un rapport de score sur 120 points avec
        recommandations priorisées.
      </p>
      <p className="hint">
        Ne tourne pas dans le navigateur (ni ici dans l'admin) — c'est un choix délibéré : l'interaction humaine
        avec la bannière cookies est plus fiable qu'une automatisation aveugle sur ~180 CMP différentes. À lancer
        depuis un terminal, à la racine du repo.
      </p>

      <p className="menu-section-label" style={{ marginTop: "1.5rem" }}>
        Lancer en local
      </p>
      <div className="tool-cmd-row">
        <code className="tool-cmd">{TRACKING_SCORE_CMD}</code>
        <button type="button" className="btn ghost tool-cmd-copy" onClick={copyCmd}>
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <p className="hint">
        Une fenêtre Chromium s'ouvre à côté du dashboard — c'est la vue de l'outil, pas un bug. Première fois :{" "}
        <code>pnpm install</code> à la racine télécharge aussi le Chromium de Playwright et le binaire Electron
        (peut prendre 1-2 min).
      </p>

      <p className="menu-section-label">Modules notés</p>
      <ul className="tool-grid">
        <li>
          <span>30</span>CMP — conformité RGPD, blocage pré-consentement, CTA
        </li>
        <li>
          <span>20</span>TMS — gouvernance des tags, container ID
        </li>
        <li>
          <span>25</span>Analytics — qualité des données GA4
        </li>
        <li>
          <span>25</span>DataLayer — nomenclature, structure e-commerce
        </li>
        <li>
          <span>20</span>Performance — Core Web Vitals (PageSpeed Insights)
        </li>
      </ul>

      <div className="actions">
        <a
          className="btn ghost"
          href="https://github.com/atrari-pro/studio-jannah/tree/main/apps/tracking-score"
          target="_blank"
          rel="noreferrer"
        >
          Voir le code / README
        </a>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </main>
  );
}

// --- Leads ---------------------------------------------------------------

function Leads({
  session,
  onBack,
  onViewProject,
}: {
  session: Session;
  onBack: () => void;
  onViewProject?: (project: string) => void;
}) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [leadsData, projectsData] = await Promise.all([
        callFunction("admin-leads", session),
        callFunction("admin-projects", session),
      ]);
      setLeads(leadsData.leads);
      setProjects(projectsData.projects);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function saveStatus(status: string, notes: string, project: string) {
    if (!selected) return;
    await callFunction("admin-leads", session, {
      method: "PATCH",
      body: JSON.stringify({ id: selected.id, status, notes, project }),
    });
    setSelected(null);
    // Recharge plutôt qu'un patch local : un projet peut avoir été
    // auto-enregistré côté serveur (voir ensureProject dans admin-leads).
    await load();
  }

  async function quickSetStatus(lead: Lead, status: string) {
    setBusyId(lead.id);
    setError(null);
    try {
      await callFunction("admin-leads", session, { method: "PATCH", body: JSON.stringify({ id: lead.id, status }) });
      setLeads((prev) => prev?.map((l) => (l.id === lead.id ? { ...l, status } : l)) ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`Supprimer définitivement le lead de ${lead.name} ? Cette action est irréversible.`)) return;
    setBusyId(lead.id);
    setError(null);
    try {
      await callFunction(`admin-leads?id=${lead.id}`, session, { method: "DELETE" });
      setLeads((prev) => prev?.filter((l) => l.id !== lead.id) ?? null);
      if (selected?.id === lead.id) setSelected(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  const projectSuggestions = projects.map((p) => p.name).sort((a, b) => a.localeCompare(b));

  if (selected) {
    const linkedProject = selected.project
      ? projects.find((p) => p.name.toLowerCase() === selected.project!.toLowerCase())
      : undefined;

    return (
      <main className="panel">
        <p className="eyebrow">Lead</p>
        <h1>{selected.name}</h1>
        <p className="foot" style={{ textAlign: "left", marginBottom: "1rem" }}>
          {selected.email} · {new Date(selected.created_at).toLocaleDateString("fr-FR")}
        </p>
        {linkedProject && (
          <div className="linked-objective" style={{ marginBottom: "1.25rem" }}>
            <div>
              <p className="hint" style={{ margin: 0 }}>Projet lié</p>
              <strong>{linkedProject.name}</strong>
            </div>
            <span className={`status-pill status-${linkedProject.status}`}>
              {PROJECT_STATUS_LABEL[linkedProject.status]}
            </span>
            <button type="button" className="btn ghost" onClick={() => onViewProject?.(linkedProject.name)}>
              Voir le projet →
            </button>
          </div>
        )}
        <p style={{ marginBottom: "1.25rem" }}>{selected.message}</p>
        <div className="actions" style={{ marginBottom: "1.25rem" }}>
          <a className="btn primary" href={gmailComposeUrl(selected)} target="_blank" rel="noopener noreferrer">
            <Mail size={16} /> Répondre via Gmail
          </a>
          <button type="button" className="btn ghost" onClick={() => deleteLead(selected)} disabled={busyId === selected.id}>
            <Trash2 size={16} /> Supprimer
          </button>
        </div>
        <LeadStatusForm lead={selected} onSave={saveStatus} onCancel={() => setSelected(null)} />
        <datalist id="project-suggestions">
          {projectSuggestions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </main>
    );
  }

  const visibleLeads = leads?.filter((l) => {
    const matchStatus = !statusFilter || (l.status || "nouveau") === statusFilter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <main className="panel">
      <p className="eyebrow">Leads</p>
      <h1>{leads ? `${leads.length} lead${leads.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}

      {leads && leads.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="options options--row" role="list">
            <button
              type="button"
              className="option"
              style={!statusFilter ? { borderColor: "var(--sj-garden-bright)" } : undefined}
              onClick={() => setStatusFilter("")}
            >
              Tous ({leads.length})
            </button>
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="option"
                style={statusFilter === s ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                onClick={() => setStatusFilter(s)}
              >
                {s} ({leads.filter((l) => (l.status || "nouveau") === s).length})
              </button>
            ))}
          </div>
          <input
            className="field"
            style={{ marginTop: "0.75rem" }}
            placeholder="Rechercher nom ou email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className="lead-list">
        {visibleLeads?.map((l) => {
          const status = l.status || "nouveau";
          return (
            <div key={l.id} className="lead-card">
              <div className="lead-card__head">
                <span className="lead-card__dot" style={{ background: LEAD_STATUS_DOT[status] }} />
                <button
                  type="button"
                  className="lead-card__name"
                  onClick={() => setSelected(l)}
                >
                  {l.name}
                </button>
                <span className="lead-card__date">{new Date(l.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
              <p className="lead-card__email">
                {l.email}
                {l.project && <span className="hint"> · projet : {l.project}</span>}
              </p>
              {l.message && <p className="lead-card__excerpt">{truncate(l.message, 140)}</p>}
              <div className="lead-card__actions">
                <select
                  className="field lead-card__status-select"
                  value={status}
                  disabled={busyId === l.id}
                  onChange={(e) => quickSetStatus(l, e.target.value)}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <a className="btn ghost" href={gmailComposeUrl(l)} target="_blank" rel="noopener noreferrer">
                  <Mail size={14} /> Gmail
                </a>
                <button type="button" className="btn ghost" onClick={() => setSelected(l)}>
                  <Pencil size={14} /> Notes
                </button>
                <button type="button" className="btn ghost" onClick={() => deleteLead(l)} disabled={busyId === l.id}>
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          );
        })}
        {leads && leads.length === 0 && <p>Aucun lead pour l’instant.</p>}
        {leads && leads.length > 0 && visibleLeads?.length === 0 && <p>Aucun lead pour ce filtre.</p>}
      </div>
      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
      <datalist id="project-suggestions">
        {projectSuggestions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {showBackToTop && (
        <button
          type="button"
          className="btn primary"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Retour en haut"
          style={{
            position: "fixed",
            right: "1.25rem",
            bottom: "1.25rem",
            borderRadius: "999px",
            width: "3rem",
            height: "3rem",
            padding: 0,
            zIndex: 30,
          }}
        >
          ↑
        </button>
      )}
    </main>
  );
}

function LeadStatusForm({
  lead,
  onSave,
  onCancel,
}: {
  lead: Lead;
  onSave: (status: string, notes: string, project: string) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(lead.status || "nouveau");
  const [notes, setNotes] = useState(lead.notes || "");
  const [project, setProject] = useState(lead.project || "");

  return (
    <div>
      <p className="eyebrow">Statut</p>
      <div className="options" role="list" style={{ marginBottom: "1.25rem" }}>
        {LEAD_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className="option"
            style={s === status ? { borderColor: "var(--sj-garden-bright)" } : undefined}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="hint" style={{ marginBottom: "0.35rem" }}>
        Projet (optionnel — une fois converti en mission réelle)
      </p>
      <input
        className="field"
        style={{ marginBottom: "1.25rem" }}
        placeholder="Nom du projet"
        list="project-suggestions"
        value={project}
        onChange={(e) => setProject(e.target.value)}
      />
      <textarea
        className="field textarea"
        placeholder="Notes internes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
      />
      <div className="actions" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn primary" onClick={() => onSave(status, notes, project)}>
          Enregistrer
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// --- Veille RSS --------------------------------------------------------
// Récupère les N derniers articles d'un flux RSS (admin-veille), les stocke
// dans veille_rss (cache — pas le pipeline éditorial), et affiche ceux
// encore status=nouveau. Le tri/résumé/publication se fait ensuite via
// AGENTS.md (Research → GEO/SEO → Publish → QA), pas ici.

function veillePrefill(item: VeilleItem): Partial<ContentForm> {
  const plainSummary = (item.summary || "").replace(/<[^>]+>/g, "").trim();
  return {
    type: "insight",
    content: [
      `Article source (veille RSS) : "${item.title}" — ${item.source}`,
      `Lien : ${item.link}`,
      "",
      "Résumé original :",
      plainSummary || "(aucun résumé disponible)",
      "",
      item.relevance_reason ? `Angle retenu (filtre pertinence) : ${item.relevance_reason}` : "",
      "",
      "Consigne : traiter en français (terminologie technique anglaise conservée telle quelle — SGTM, dataLayer, server-side... jamais traduite), angle mesure/tracking/CRO/data-IA de Studio Jannah.",
    ]
      .filter(Boolean)
      .join("\n"),
    sources: `${item.source} — ${item.title} | ${item.link}`,
  };
}

function Veille({
  session,
  onBack,
  onGenerateDraft,
}: {
  session: Session;
  onBack: () => void;
  onGenerateDraft: (prefill: Partial<ContentForm>) => void;
}) {
  const [items, setItems] = useState<VeilleItem[] | null>(null);
  const [count, setCount] = useState(10);
  const [source, setSource] = useState(DEFAULT_VEILLE_FEED);
  const [loading, setLoading] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ fetched: number; inserted: number } | null>(null);
  const [lastFiltered, setLastFiltered] = useState<number | null>(null);

  // Filtres d'affichage — appliqués côté client sur la liste déjà chargée
  // (pas de round-trip réseau, c'est juste du tri/masquage local).
  const [relevanceFilter, setRelevanceFilter] = useState<"all" | "pertinent" | "hors_scope" | "non_juge">("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function loadList() {
    try {
      const data = await callFunction(`admin-veille?status=nouveau`, session);
      setItems(data.items);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchFeed() {
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const data = await callFunction("admin-veille", session, {
        method: "POST",
        body: JSON.stringify({ count, source }),
      });
      setLastResult(data);
      await loadList();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function filterArticles() {
    setFiltering(true);
    setError(null);
    setLastFiltered(null);
    try {
      const data = await callFunction("admin-veille-filter", session, { method: "POST" });
      setLastFiltered(data.judged);
      await loadList();
    } catch (e) {
      setError(String(e));
    } finally {
      setFiltering(false);
    }
  }

  const sources = items
    ? [...new Set(items.map((i) => i.source))].sort((a, b) => a.localeCompare(b))
    : [];

  const sortedItems = items ? [...items].sort((a, b) => relevanceRank(a) - relevanceRank(b)) : null;

  const visibleItems = sortedItems?.filter((item) => {
    const matchRelevance =
      relevanceFilter === "all" ||
      (relevanceFilter === "non_juge" ? !item.relevance : item.relevance === relevanceFilter);
    const matchSource = !sourceFilter || item.source === sourceFilter;
    const matchQuery = !query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase());
    return matchRelevance && matchSource && matchQuery;
  });

  const RELEVANCE_FILTERS: { value: typeof relevanceFilter; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "pertinent", label: "Pertinent" },
    { value: "non_juge", label: "Non jugé" },
    { value: "hors_scope", label: "Hors scope" },
  ];

  return (
    <main className="panel">
      <p className="eyebrow">Veille RSS</p>
      <h1>Récupérer des articles</h1>

      <p className="hint">Nombre d'articles</p>
      <input
        className="field"
        type="number"
        min={1}
        max={50}
        value={count}
        onChange={(e) => setCount(Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), 50))}
      />
      <p className="hint">URL du flux RSS</p>
      <input className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://…" />

      <div className="actions" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn primary" onClick={fetchFeed} disabled={loading}>
          {loading ? "Récupération…" : "Récupérer"}
        </button>
        <button type="button" className="btn ghost" onClick={filterArticles} disabled={filtering}>
          {filtering ? "Filtrage…" : "Filtrer (IA)"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {lastResult && (
        <p className="hint">
          {lastResult.fetched} article{lastResult.fetched > 1 ? "s" : ""} lu
          {lastResult.fetched > 1 ? "s" : ""} dans le flux, {lastResult.inserted} nouveau
          {lastResult.inserted > 1 ? "x" : ""} enregistré{lastResult.inserted > 1 ? "s" : ""} (le reste était déjà
          connu).
        </p>
      )}
      {lastFiltered !== null && (
        <p className="hint">
          {lastFiltered} article{lastFiltered > 1 ? "s" : ""} jugé{lastFiltered > 1 ? "s" : ""} (les autres étaient
          déjà classés).
        </p>
      )}

      {items && items.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="hint">Filtrer</p>
          <div className="options options--row" role="list">
            {RELEVANCE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="option"
                style={relevanceFilter === f.value ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                onClick={() => setRelevanceFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {sources.length > 1 && (
            <>
              <p className="hint" style={{ marginTop: "0.75rem" }}>
                Source
              </p>
              <select className="field" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">Toutes ({items.length})</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s} ({items.filter((i) => i.source === s).length})
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            className="field"
            style={{ marginTop: "0.75rem" }}
            placeholder="Rechercher un titre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <p className="eyebrow" style={{ marginTop: "1.5rem" }}>
        {items
          ? `${visibleItems?.length ?? 0} article${(visibleItems?.length ?? 0) > 1 ? "s" : ""}` +
            (visibleItems?.length !== items.length ? ` (sur ${items.length})` : "")
          : "Chargement…"}
      </p>
      <div className="options" role="list">
        {visibleItems?.map((item) => (
          <div key={item.id} className="option" style={{ display: "grid", gap: "0.5rem" }}>
            <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              <strong>{item.title}</strong> — {item.source}
              {item.published_at ? ` · ${new Date(item.published_at).toLocaleDateString("fr-FR")}` : ""}
              {item.relevance && (
                <>
                  {" "}
                  <span className={`status-pill status-${item.relevance}`}>
                    {item.relevance === "pertinent" ? "pertinent" : "hors scope"}
                  </span>
                </>
              )}
            </a>
            {item.relevance_reason && (
              <p className="hint" style={{ margin: 0 }}>
                {item.relevance_reason}
              </p>
            )}
            {item.relevance === "pertinent" && (
              <div>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onGenerateDraft(veillePrefill(item))}
                >
                  Générer un draft →
                </button>
              </div>
            )}
          </div>
        ))}
        {items && items.length === 0 && <p>Aucun article en attente — lance une récupération.</p>}
        {items && items.length > 0 && visibleItems?.length === 0 && <p>Aucun article pour ce filtre.</p>}
      </div>

      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="btn primary"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Retour en haut"
          style={{
            position: "fixed",
            right: "1.25rem",
            bottom: "1.25rem",
            borderRadius: "999px",
            width: "3rem",
            height: "3rem",
            padding: 0,
            zIndex: 30,
          }}
        >
          ↑
        </button>
      )}
    </main>
  );
}

// --- Tâches (ponctuel, frise React/CSS maison) --------------------------
// Première version basée sur frappe-gantt (lib externe) : abandonnée après
// un bug de theming réel (voir docs/ADMIN_TASKS.md) — remplacée par une
// frise maison, entièrement contrôlée en React, vérifiable sans navigateur.
// Une seule plage continue jour par jour (pas de mode Jour/Semaine/Mois à
// re-synchroniser), qui couvre toujours l'intégralité des tâches visibles
// pour qu'on ne se perde jamais dans la navigation — on scroll
// horizontalement, avec un bouton "Aujourd'hui" pour se recentrer.

const TIMELINE_DAY_WIDTH = 44;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseISODate(iso: string): Date {
  return startOfDay(new Date(`${iso}T00:00:00`));
}

function buildTimelineRange(tasks: Task[]): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  let start = new Date(today);
  start.setDate(start.getDate() - 7);
  let end = new Date(today);
  end.setDate(end.getDate() + 60);
  for (const t of tasks) {
    const s = parseISODate(t.start_date);
    const e = parseISODate(t.end_date);
    if (s < start) start = s;
    if (e > end) end = e;
  }
  return { start, end };
}

function TaskTimeline({
  tasks,
  onSelect,
  showProject,
}: {
  tasks: Task[];
  onSelect: (task: Task) => void;
  // Vue portefeuille (Roadmap, tous projets confondus) : préfixe chaque
  // barre par son projet et groupe les lignes par projet — sans ça, une
  // frise à plusieurs projets mélangés est illisible.
  showProject?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const orderedTasks = useMemo(
    () =>
      showProject
        ? [...tasks].sort((a, b) => a.project.localeCompare(b.project) || a.start_date.localeCompare(b.start_date))
        : tasks,
    [tasks, showProject],
  );
  const rangeKey = useMemo(() => tasks.map((t) => `${t.id}:${t.start_date}:${t.end_date}`).join("|"), [tasks]);
  const { start, end } = useMemo(() => buildTimelineRange(tasks), [rangeKey]);
  const totalDays = daysBetween(start, end) + 1;
  const days = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [start.getTime(), totalDays],
  );
  const todayIndex = daysBetween(start, startOfDay(new Date()));

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    for (const d of days) {
      const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.span += 1;
      else groups.push({ label, span: 1 });
    }
    return groups;
  }, [days]);

  function scrollToToday(behavior: ScrollBehavior = "smooth") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: Math.max(0, todayIndex * TIMELINE_DAY_WIDTH - 200), behavior });
  }

  useEffect(() => {
    scrollToToday("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start.getTime()]);

  return (
    <div>
      <div className="actions" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="btn ghost" onClick={() => scrollToToday()}>
          <CalendarDays size={16} /> Aujourd'hui
        </button>
      </div>
      <div className="timeline" ref={scrollRef}>
        <div className="timeline__scroll" style={{ width: totalDays * TIMELINE_DAY_WIDTH }}>
          <div className="timeline__header" style={{ flexDirection: "column" }}>
            <div style={{ display: "flex" }}>
              {monthGroups.map((g, i) => (
                <div
                  key={i}
                  className="timeline__month"
                  style={{ width: g.span * TIMELINE_DAY_WIDTH }}
                >
                  {g.label}
                </div>
              ))}
            </div>
            <div style={{ display: "flex" }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`timeline__col-head${i === todayIndex ? " is-today" : ""}`}
                  style={{ width: TIMELINE_DAY_WIDTH, flex: "none" }}
                >
                  {d.getDate()}
                </div>
              ))}
            </div>
          </div>
          <div className="timeline__body">
            {todayIndex >= 0 && todayIndex < totalDays && (
              <div
                className="timeline__today-line"
                style={{ left: todayIndex * TIMELINE_DAY_WIDTH + TIMELINE_DAY_WIDTH / 2 }}
              />
            )}
            {tasks.length === 0 && <p className="hint" style={{ padding: "1rem" }}>Aucune tâche pour ce filtre.</p>}
            {orderedTasks.map((t) => {
              const s = daysBetween(start, parseISODate(t.start_date));
              const e = daysBetween(start, parseISODate(t.end_date));
              const left = s * TIMELINE_DAY_WIDTH;
              const width = Math.max((e - s + 1) * TIMELINE_DAY_WIDTH - 6, 28);
              return (
                <div key={t.id} className="timeline__row">
                  {days.map((_, i) => (
                    <div key={i} className="timeline__col" style={{ width: TIMELINE_DAY_WIDTH, flex: "none" }} />
                  ))}
                  <div
                    className={`timeline__bar status-${t.status}`}
                    style={{ left, width, ...(t.category ? { borderLeft: `3px solid ${categoryColor(t.category)}` } : {}) }}
                    title={`${t.title} · ${t.project}${t.category ? ` · ${t.category}` : ""} · ${formatDateFR(t.start_date)} → ${formatDateFR(t.end_date)}`}
                    onClick={() => onSelect(t)}
                  >
                    {showProject ? `${t.project} · ${t.title}` : t.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Projets (statut de premier niveau, lié à Tâches/Objectifs par nom) --

type PlanningView = "today" | "roadmap" | "projects";

const PLANNING_NAV_ITEMS: { value: PlanningView; icon: typeof CalendarDays; label: string }[] = [
  { value: "today", icon: CalendarDays, label: "Aujourd'hui" },
  { value: "roadmap", icon: GanttChartSquare, label: "Roadmap" },
  { value: "projects", icon: FolderKanban, label: "Projets" },
];

// Coquille de nav propre à Planning (sidebar desktop / barre d'onglets
// mobile en bas) — scope volontairement limité à cet écran, pas à toute
// l'admin. Toujours visible, y compris en détail projet/tâche : cohérence
// avant gain d'espace ponctuel, et ça évite de se retrouver "coincé" sans
// moyen de changer d'onglet depuis un sous-écran.
function PlanningShell({
  view,
  onChangeView,
  categorySuggestions,
  children,
}: {
  view: PlanningView;
  onChangeView: (v: PlanningView) => void;
  categorySuggestions?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="planning-shell">
      <nav className="planning-nav" aria-label="Navigation Planning">
        {PLANNING_NAV_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`planning-nav__item${view === item.value ? " is-active" : ""}`}
            aria-current={view === item.value ? "page" : undefined}
            onClick={() => onChangeView(item.value)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="planning-shell__content">
        {children}
        {/* Autocomplete catégorie (formulaires tâche) — un seul endroit,
            partagé par toutes les sous-vues wrappées par PlanningShell. */}
        <datalist id="category-suggestions">
          {(categorySuggestions ?? []).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

const EMPTY_PROJECT_FORM = { name: "", notes: "" };
const EMPTY_PROJECT_TASK_FORM = {
  title: "",
  start_date: todayISO(),
  end_date: todayISO(),
  notes: "",
  category: "",
};
function Projects({
  session,
  onBack,
  initialProject,
  onConsumeInitialProject,
}: {
  session: Session;
  onBack: () => void;
  initialProject?: string;
  onConsumeInitialProject?: () => void;
}) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | Project["status"]>("");
  // Filtre catégorie — pertinent seulement sur la Roadmap (catégorie = tâche,
  // pas projet ; filtrer la liste de projets par catégorie n'aurait pas de
  // sens direct).
  const [categoryFilter, setCategoryFilter] = useState("");
  // Onglet Planning actif (nav sidebar/bottom-bar, voir PlanningShell) —
  // "Aujourd'hui" par défaut : c'est la question la plus utile à l'ouverture.
  const [planningView, setPlanningView] = useState<PlanningView>("today");
  const [selected, setSelected] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PROJECT_FORM);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Tâches du projet ouvert — créées/modifiées ici, plus dans un module à
  // part (voir plan d'archi : "Projet = écran unique").
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_PROJECT_TASK_FORM);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState(EMPTY_PROJECT_TASK_FORM);

  async function load() {
    try {
      const [projectsData, tasksData] = await Promise.all([
        callFunction("admin-projects", session),
        callFunction("admin-tasks", session),
      ]);
      setProjects(projectsData.projects);
      setTasks(tasksData.tasks);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Vient de Leads ("Voir le projet") — consommé une fois.
  useEffect(() => {
    if (initialProject && projects) {
      const found = projects.find((p) => p.name.toLowerCase() === initialProject.toLowerCase());
      if (found) setSelected(found);
      onConsumeInitialProject?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProject, projects]);

  // Un patch/checkin recharge tout (load()) plutôt que de patcher l'état
  // local : `selected` reste alors une photo périmée (mauvais statut
  // surligné, notes obsolètes) tant qu'on ne resynchronise pas depuis la
  // liste fraîche. Ce petit effet fait ce raccord automatiquement.
  useEffect(() => {
    if (selected && projects) {
      const fresh = projects.find((p) => p.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // Change de projet ouvert (ou revient à la liste) : referme les
  // sous-formulaires/sous-sélections du projet précédent.
  useEffect(() => {
    setSelectedTask(null);
    setEditingTask(false);
    setShowTaskForm(false);
    setEditingNotes(false);
  }, [selected?.id]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-projects", session, {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), notes: form.notes.trim() || null }),
      });
      setForm(EMPTY_PROJECT_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateProject(id: string, fields: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-projects", session, { method: "PATCH", body: JSON.stringify({ id, ...fields }) });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project: Project) {
    if (
      !window.confirm(
        `Supprimer le projet "${project.name}" ? Les tâches déjà créées pour ce nom ne sont pas supprimées — elles perdent juste ce suivi de statut, jusqu'à ce qu'une nouvelle tâche recrée le projet.`,
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await callFunction(`admin-projects?id=${project.id}`, session, { method: "DELETE" });
      setSelected(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !taskForm.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-tasks", session, {
        method: "POST",
        body: JSON.stringify({
          project: selected.name,
          title: taskForm.title,
          start_date: taskForm.start_date,
          end_date: taskForm.end_date,
          status: "a_faire",
          category: taskForm.category.trim() || null,
        }),
      });
      setTaskForm(EMPTY_PROJECT_TASK_FORM);
      setShowTaskForm(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function patchTask(id: string, fields: Partial<Task>) {
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-tasks", session, { method: "PATCH", body: JSON.stringify({ id, ...fields }) });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(id: string) {
    setSaving(true);
    setError(null);
    try {
      await callFunction(`admin-tasks?id=${id}`, session, { method: "DELETE" });
      setSelectedTask(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function relatedTasksOf(project: Project) {
    return tasks.filter((t) => t.project.toLowerCase() === project.name.toLowerCase());
  }

  const visibleProjects = projects?.filter((p) => !statusFilter || p.status === statusFilter);
  const categorySuggestions = [...new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b),
  );

  if (selected) {
    const relatedTasks = relatedTasksOf(selected);
    const lateTasks = countLateTasks(relatedTasks, todayISO());

    // --- Sous-vue : détail d'une tâche, ouverte depuis sa carte ci-dessous.
    if (selectedTask) {
      async function saveTaskEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTask || !editTaskForm.title.trim()) return;
        await patchTask(selectedTask.id, editTaskForm);
        setEditingTask(false);
        setSelectedTask(null);
      }

      return (
        <PlanningShell view={planningView} onChangeView={setPlanningView} categorySuggestions={categorySuggestions}>
        <main className="panel">
          <p className="eyebrow">{selected.name} · Tâche</p>
          {editingTask ? (
            <form onSubmit={saveTaskEdit} className="mt-50" style={{ display: "grid", gap: "0.65rem" }}>
              <input
                className="field"
                placeholder="Titre de la tâche"
                value={editTaskForm.title}
                onChange={(e) => setEditTaskForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <div style={{ display: "flex", gap: "0.65rem" }}>
                <input
                  className="field"
                  type="date"
                  value={editTaskForm.start_date}
                  onChange={(e) => setEditTaskForm((f) => ({ ...f, start_date: e.target.value }))}
                  required
                />
                <input
                  className="field"
                  type="date"
                  value={editTaskForm.end_date}
                  min={editTaskForm.start_date}
                  onChange={(e) => setEditTaskForm((f) => ({ ...f, end_date: e.target.value }))}
                  required
                />
              </div>
              <textarea
                className="field textarea"
                placeholder="Notes (optionnel)"
                rows={3}
                value={editTaskForm.notes}
                onChange={(e) => setEditTaskForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <input
                className="field"
                placeholder="Catégorie (optionnel)"
                list="category-suggestions"
                value={editTaskForm.category}
                onChange={(e) => setEditTaskForm((f) => ({ ...f, category: e.target.value }))}
              />
              <div className="actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "…" : "Enregistrer"}
                </button>
                <button type="button" className="btn ghost" onClick={() => setEditingTask(false)}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1>{selectedTask.title}</h1>
              <p className="hint">
                {formatDateFR(selectedTask.start_date)} → {formatDateFR(selectedTask.end_date)}
              </p>
            </>
          )}
          {error && <p className="error">{error}</p>}

          {!editingTask && (
            <>
              <p className="hint mt-100">
                Statut
              </p>
              <div className="options options--row" role="list">
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`option${selectedTask.status === s ? " is-active" : ""}`}
                    onClick={() => {
                      patchTask(selectedTask.id, { status: s });
                      setSelectedTask(null);
                    }}
                    disabled={saving}
                  >
                    {TASK_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {selectedTask.notes && <p className="mt-100">{selectedTask.notes}</p>}

              <div className="actions mt-125">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setEditTaskForm({
                      title: selectedTask.title,
                      start_date: selectedTask.start_date,
                      end_date: selectedTask.end_date,
                      notes: selectedTask.notes ?? "",
                      category: selectedTask.category ?? "",
                    });
                    setEditingTask(true);
                  }}
                >
                  <Pencil size={16} /> Modifier
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => deleteTask(selectedTask.id)}
                  disabled={saving}
                >
                  <Trash2 size={16} /> Supprimer
                </button>
                <button type="button" className="btn ghost" onClick={() => setSelectedTask(null)}>
                  ← Retour au projet
                </button>
              </div>
            </>
          )}
        </main>
        </PlanningShell>
      );
    }

    return (
      <PlanningShell view={planningView} onChangeView={setPlanningView} categorySuggestions={categorySuggestions}>
      <main className="panel">
        <p className="eyebrow">Projet</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {selected.name}
          <span className={`status-pill status-${selected.status}`}>{PROJECT_STATUS_LABEL[selected.status]}</span>
          {lateTasks > 0 && <span className="hint">{lateTasks} tâche{lateTasks > 1 ? "s" : ""} en retard</span>}
        </h1>
        {error && <p className="error">{error}</p>}

        <p className="hint mt-75">Statut</p>
        <div className="options options--row" role="list">
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`option${selected.status === s ? " is-active" : ""}`}
              onClick={() => updateProject(selected.id, { status: s })}
              disabled={saving}
            >
              {PROJECT_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* --- Tâches : créées, cochées et modifiées directement ici — plus de
            section séparée à rejoindre par un lien "voir →". */}
        <div className="linked-tasks mt-150">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <p className="hint" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <ListTodo size={14} /> Tâches {relatedTasks.length > 0 && `(${relatedTasks.length})`}
            </p>
            <button type="button" className="btn ghost" onClick={() => setShowTaskForm((v) => !v)}>
              <Plus size={14} /> {showTaskForm ? "Annuler" : "Nouvelle tâche"}
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={createTask} className="mt-85" style={{ display: "grid", gap: "0.6rem" }}>
              <input
                className="field"
                placeholder="Titre de la tâche"
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <input
                  className="field"
                  type="date"
                  value={taskForm.start_date}
                  onChange={(e) => setTaskForm((f) => ({ ...f, start_date: e.target.value }))}
                  required
                />
                <input
                  className="field"
                  type="date"
                  value={taskForm.end_date}
                  min={taskForm.start_date}
                  onChange={(e) => setTaskForm((f) => ({ ...f, end_date: e.target.value }))}
                  required
                />
              </div>
              <input
                className="field"
                placeholder="Catégorie (optionnel)"
                list="category-suggestions"
                value={taskForm.category}
                onChange={(e) => setTaskForm((f) => ({ ...f, category: e.target.value }))}
              />
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "…" : "Créer"}
              </button>
            </form>
          )}

          {relatedTasks.length === 0 ? (
            <p className="hint mt-60">
              Aucune tâche sur ce projet pour l'instant.
            </p>
          ) : (
            <>
              <div className="task-list mt-85">
                {relatedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="task-card"
                    style={t.category ? { borderLeft: `3px solid ${categoryColor(t.category)}` } : undefined}
                  >
                    <div className="task-card__head">
                      <span className={`task-card__dot status-dot status-${t.status}`} />
                      <button type="button" className="task-card__name" onClick={() => setSelectedTask(t)}>
                        {t.title}
                      </button>
                      {t.category && (
                        <span className="category-chip" style={{ color: categoryColor(t.category) }}>
                          {t.category}
                        </span>
                      )}
                    </div>
                    <p className="hint" style={{ margin: "0.3rem 0 0" }}>
                      {formatDateFR(t.start_date)} → {formatDateFR(t.end_date)}
                    </p>
                    <div className="task-card__actions">
                      <select
                        className="field task-card__status-select"
                        value={t.status}
                        disabled={saving}
                        onChange={(e) => patchTask(t.id, { status: e.target.value as Task["status"] })}
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn ghost" onClick={() => setSelectedTask(t)}>
                        <Pencil size={14} /> Détail
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {relatedTasks.length > 1 && (
                <>
                  <p className="hint mt-100" style={{ marginBottom: "0.5rem" }}>
                    Frise
                  </p>
                  <TaskTimeline tasks={relatedTasks} onSelect={(t) => setSelectedTask(t)} />
                </>
              )}
            </>
          )}
        </div>

        <p className="hint mt-150">Notes</p>
        {editingNotes ? (
          <div className="mt-40">
            <textarea
              className="field textarea"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={4}
            />
            <div className="actions mt-60">
              <button
                type="button"
                className="btn primary"
                disabled={saving}
                onClick={async () => {
                  await updateProject(selected.id, { notes: notesDraft.trim() || null });
                  setEditingNotes(false);
                }}
              >
                {saving ? "…" : "Enregistrer"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setEditingNotes(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ margin: "0.4rem 0 0", color: selected.notes ? undefined : "var(--sj-muted)" }}>
              {selected.notes || "Aucune note."}
            </p>
            <button
              type="button"
              className="btn ghost mt-50"
              onClick={() => {
                setNotesDraft(selected.notes || "");
                setEditingNotes(true);
              }}
            >
              <Pencil size={14} /> Modifier les notes
            </button>
          </>
        )}

        <div className="actions mt-150">
          <button type="button" className="btn ghost" onClick={() => deleteProject(selected)} disabled={saving}>
            <Trash2 size={16} /> Supprimer
          </button>
          <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
        </div>
      </main>
      </PlanningShell>
    );
  }

  if (planningView === "today") {
    const today = todayISO();
    const todayTasks = tasks
      .filter((t) => t.status !== "fait" && t.end_date <= today)
      .sort((a, b) => a.end_date.localeCompare(b.end_date));
    const openTaskByProject = (task: Task) => {
      const project = projects?.find((p) => p.name.toLowerCase() === task.project.toLowerCase());
      if (project) {
        setSelected(project);
        setSelectedTask(task);
      }
    };

    return (
      <PlanningShell view={planningView} onChangeView={setPlanningView} categorySuggestions={categorySuggestions}>
        <main className="panel">
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CalendarDays size={14} /> Aujourd'hui
          </p>
          <h1>{formatDateFR(today)}</h1>
          {error && <p className="error">{error}</p>}

          <p className="hint mt-125">
            Tâches dues ou en retard {todayTasks.length > 0 && `(${todayTasks.length})`}
          </p>
          {todayTasks.length === 0 ? (
            <p className="mt-50" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CircleCheck size={16} /> Rien en attente — tout est à jour.
            </p>
          ) : (
            <div className="project-list mt-50">
              {todayTasks.map((t) => {
                const isLate = t.end_date < today;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="project-card"
                    style={t.category ? { borderLeft: `3px solid ${categoryColor(t.category)}` } : undefined}
                    onClick={() => openTaskByProject(t)}
                  >
                    <div className="project-card__head">
                      <strong>{t.title}</strong>
                      <span className={`status-pill${isLate ? " status-hors_scope" : " status-actif"}`}>
                        {isLate ? "En retard" : "Aujourd'hui"}
                      </span>
                      {t.category && (
                        <span className="category-chip" style={{ color: categoryColor(t.category) }}>
                          {t.category}
                        </span>
                      )}
                    </div>
                    <p className="hint" style={{ margin: "0.4rem 0 0" }}>
                      {t.project} · échéance {formatDateFR(t.end_date)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </PlanningShell>
    );
  }

  return (
    <PlanningShell view={planningView} onChangeView={setPlanningView} categorySuggestions={categorySuggestions}>
    <main className="panel">
      <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {planningView === "roadmap" ? <GanttChartSquare size={14} /> : <Target size={14} />}
        {planningView === "roadmap" ? "Roadmap" : "Projets"}
      </p>
      <h1>{projects ? `${projects.length} projet${projects.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}

      {planningView === "projects" && (
        <div className="actions mt-100">
          <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> {showForm ? "Annuler" : "Nouveau projet"}
          </button>
        </div>
      )}

      {planningView === "projects" && showForm && (
        <form onSubmit={createProject} className="mt-100" style={{ display: "grid", gap: "0.65rem" }}>
          <input
            className="field"
            placeholder="Nom du projet"
            list="project-suggestions"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <textarea
            className="field textarea"
            placeholder="Notes (optionnel)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "…" : "Créer"}
          </button>
        </form>
      )}

      {projects && projects.length > 0 && (
        <div className="options options--row" role="list" style={{ margin: "1.25rem 0 0" }}>
          <button
            type="button"
            className={`option${!statusFilter ? " is-active" : ""}`}
            onClick={() => setStatusFilter("")}
          >
            Tous ({projects.length})
          </button>
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`option${statusFilter === s ? " is-active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {PROJECT_STATUS_LABEL[s]} ({projects.filter((p) => p.status === s).length})
            </button>
          ))}
        </div>
      )}

      {planningView === "roadmap" && categorySuggestions.length > 0 && (
        <div className="options options--row" role="list" style={{ margin: "0.75rem 0 0" }}>
          <button
            type="button"
            className={`option${!categoryFilter ? " is-active" : ""}`}
            onClick={() => setCategoryFilter("")}
          >
            Toutes catégories
          </button>
          {categorySuggestions.map((c) => (
            <button
              key={c}
              type="button"
              className="option"
              style={categoryFilter === c ? { borderColor: categoryColor(c) } : undefined}
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {planningView === "roadmap" &&
        (visibleProjects && visibleProjects.length > 0 ? (
          <div className="mt-100">
            <TaskTimeline
              tasks={tasks.filter(
                (t) =>
                  visibleProjects.some((p) => p.name.toLowerCase() === t.project.toLowerCase()) &&
                  (!categoryFilter || t.category === categoryFilter),
              )}
              showProject
              onSelect={(t) => {
                const project = projects?.find((p) => p.name.toLowerCase() === t.project.toLowerCase());
                if (project) setSelected(project);
              }}
            />
          </div>
        ) : (
          <p className="mt-100">Aucun projet pour ce filtre.</p>
        ))}

      {planningView === "projects" && (
        <div className="project-list mt-100">
          {visibleProjects?.map((p) => {
            const relatedTasks = relatedTasksOf(p);
            const openTasks = relatedTasks.filter((t) => t.status !== "fait").length;
            const lateTasks = countLateTasks(relatedTasks, todayISO());
            return (
              <button key={p.id} type="button" className="project-card" onClick={() => setSelected(p)}>
                <div className="project-card__head">
                  <strong>{p.name}</strong>
                  <span className={`status-pill status-${p.status}`}>{PROJECT_STATUS_LABEL[p.status]}</span>
                </div>
                <p className="hint" style={{ margin: "0.4rem 0 0" }}>
                  {relatedTasks.length === 0
                    ? "Aucune tâche"
                    : `${openTasks} tâche${openTasks > 1 ? "s" : ""} en cours sur ${relatedTasks.length}`}
                  {lateTasks > 0 && ` (${lateTasks} en retard)`}
                </p>
              </button>
            );
          })}
          {projects && projects.length === 0 && (
            <p>
              Aucun projet pour l'instant — un projet s'enregistre automatiquement dès qu'il est utilisé dans une
              tâche ou un lead, ou crée-le ici directement.
            </p>
          )}
          {projects && projects.length > 0 && visibleProjects?.length === 0 && <p>Aucun projet pour ce filtre.</p>}
        </div>
      )}

      <div className="actions mt-150">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
      <datalist id="project-suggestions">
        {[...new Set([...(projects ?? []).map((p) => p.name), ...tasks.map((t) => t.project)])]
          .sort((a, b) => a.localeCompare(b))
          .map((p) => (
            <option key={p} value={p} />
          ))}
      </datalist>
    </main>
    </PlanningShell>
  );
}

// --- Contenu (wizard) ------------------------------------------------

type ContentStep =
  | "type"
  | "rubrique"
  | "format"
  | "video"
  | "sector"
  | "complexity"
  | "content"
  | "sources"
  | "recap"
  | "result";

function nextStep(step: ContentStep, form: ContentForm): ContentStep {
  switch (step) {
    case "type":
      return form.type === "insight" ? "rubrique" : "sector";
    case "rubrique":
      return "format";
    case "format":
      return form.format === "vidéo" ? "video" : "content";
    case "video":
      return "content";
    case "sector":
      return "complexity";
    case "complexity":
      return "content";
    case "content":
      return form.type === "insight" ? "sources" : "recap";
    case "sources":
      return "recap";
    default:
      return "result";
  }
}

function Content({
  session,
  onBack,
  prefill,
}: {
  session: Session;
  onBack: () => void;
  prefill?: Partial<ContentForm> | null;
}) {
  // prefill vient de Veille ("Générer un draft") : type déjà connu
  // (toujours "insight" pour l'instant), donc on saute direct à la
  // sélection de rubrique plutôt que de redemander insight/use-case.
  const [step, setStep] = useState<ContentStep>(prefill ? "rubrique" : "type");
  const [history, setHistory] = useState<ContentStep[]>([]);
  const [form, setForm] = useState<ContentForm>({ ...EMPTY_FORM, ...prefill });
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [qaIssues, setQaIssues] = useState<string[]>([]);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go(s: ContentStep) {
    setHistory((h) => [...h, step]);
    setStep(s);
  }

  function back() {
    const prev = history[history.length - 1];
    if (!prev) return onBack();
    setHistory((h) => h.slice(0, -1));
    setStep(prev);
  }

  async function generatePreview() {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "preview", form }),
      });
      setPreview(data.result);
      setQaIssues(data.qaIssues || []);
      go("result");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "publish", form, result: preview }),
      });
      setPrUrl(data.prUrl);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const set = <K extends keyof ContentForm>(k: K, v: ContentForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <main className="panel">
      <p className="eyebrow">Contenu</p>

      {step === "type" && (
        <StepOptions
          title="Insight ou use case ?"
          options={[
            { value: "insight", label: "Insight (Blog)" },
            { value: "use-case", label: "Use case" },
          ]}
          onPick={(v) => {
            set("type", v as ContentForm["type"]);
            go(nextStep("type", { ...form, type: v as ContentForm["type"] }));
          }}
        />
      )}

      {step === "rubrique" && (
        <StepOptions
          title="Quelle rubrique ?"
          options={RUBRIQUES.map((r) => ({ value: r, label: r }))}
          onPick={(v) => {
            set("rubrique", v);
            go(nextStep("rubrique", form));
          }}
        />
      )}

      {step === "format" && (
        <StepOptions
          title="Quel format ?"
          options={[
            { value: "texte", label: "Texte" },
            { value: "vidéo", label: "Vidéo (ex. NotebookLM)" },
          ]}
          onPick={(v) => {
            const f = { ...form, format: v as ContentForm["format"] };
            setForm(f);
            go(nextStep("format", f));
          }}
        />
      )}

      {step === "video" && (
        <div>
          <h1>Source vidéo</h1>
          <p className="hint">
            URL directe vers un fichier lisible (mp4…) — pas un lien de page (YouTube ne fonctionnera pas tel quel).
          </p>
          <input
            className="field"
            placeholder="https://…"
            value={form.videoSrc}
            onChange={(e) => set("videoSrc", e.target.value)}
          />
          <input
            className="field"
            placeholder="Légende (optionnel)"
            value={form.videoCaption}
            onChange={(e) => set("videoCaption", e.target.value)}
          />
          <StepNav onNext={() => go(nextStep("video", form))} disabled={!form.videoSrc} />
        </div>
      )}

      {step === "sector" && (
        <div>
          <h1>Quel secteur ?</h1>
          <input
            className="field"
            placeholder="ex. Retail, Paiement, Télécom"
            value={form.sector}
            onChange={(e) => set("sector", e.target.value)}
          />
          <StepNav onNext={() => go(nextStep("sector", form))} disabled={!form.sector} />
        </div>
      )}

      {step === "complexity" && (
        <StepOptions
          title="Quelle complexité ?"
          options={COMPLEXITES.map((c) => ({ value: c, label: c }))}
          onPick={(v) => {
            set("complexity", v);
            go(nextStep("complexity", form));
          }}
        />
      )}

      {step === "content" && (
        <div>
          <h1>Texte brut / notes</h1>
          <textarea
            className="field textarea"
            rows={8}
            placeholder="Colle tout ce que tu as…"
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
          />
          <StepNav onNext={() => go(nextStep("content", form))} disabled={!form.content.trim()} />
        </div>
      )}

      {step === "sources" && (
        <div>
          <h1>Sources</h1>
          <p className="hint">
            Une par ligne : Label | URL. Si tu laisses vide, l’agent peut proposer 2-3 sources réelles
            (documentation officielle) à valider à l’étape suivante — jamais inventées, jamais d’autres si tu en
            fournis.
          </p>
          <textarea
            className="field textarea"
            rows={4}
            placeholder={"Google — AI features | https://developers.google.com/..."}
            value={form.sources}
            onChange={(e) => set("sources", e.target.value)}
          />
          <StepNav onNext={() => go(nextStep("sources", form))} />
        </div>
      )}

      {step === "recap" && (
        <div>
          <h1>Prêt à générer</h1>
          <ul className="summary">
            <li>
              <span>Type</span>
              {form.type}
            </li>
            <li>
              <span>{form.type === "insight" ? "Rubrique" : "Secteur"}</span>
              {form.type === "insight" ? form.rubrique : `${form.sector} · ${form.complexity}`}
            </li>
            {form.type === "insight" && (
              <li>
                <span>Format</span>
                {form.format}
              </li>
            )}
          </ul>
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button type="button" className="btn primary" onClick={generatePreview} disabled={loading}>
              {loading ? "Génération…" : "Générer"}
            </button>
          </div>
        </div>
      )}

      {step === "result" && preview && (
        <div>
          <h1>{String(preview.title)}</h1>
          <p style={{ marginBottom: "1rem" }}>{String(preview.description)}</p>
          <p className="hint">status: draft — rien n’est publié tant que tu n’as pas mergé la PR.</p>
          {!form.sources.trim() && Array.isArray(preview.sources) && preview.sources.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <p className="eyebrow">Sources proposées par l’agent (à vérifier)</p>
              <ul className="summary">
                {(preview.sources as { label: string; url: string }[]).map((s) => (
                  <li key={s.url}>
                    {s.label} — <a href={s.url}>{s.url}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {qaIssues.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <p className="eyebrow">À vérifier (auto-QA)</p>
              <ul className="summary">
                {qaIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {prUrl ? (
            <p className="foot" style={{ textAlign: "left" }}>
              PR ouverte : <a href={prUrl}>{prUrl}</a>
            </p>
          ) : (
            <div className="actions">
              <button type="button" className="btn primary" onClick={publish} disabled={loading}>
                {loading ? "…" : "Ouvrir la PR"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={back}>
          ← Retour
        </button>
      </div>
    </main>
  );
}

// --- Drafts en attente (PR ouvertes) ----------------------------------

type DraftSummary = {
  number: number;
  title: string;
  htmlUrl: string;
  createdAt: string;
  headRef: string;
};

type DraftFields = {
  title: string;
  description: string;
  status: string;
  hook: string;
  rubrique: string;
  sector: string;
  complexity: string;
  tags: string[];
  themes: string[];
};

type DraftFile = {
  prNumber: number;
  headRef: string;
  path: string;
  prUrl: string;
  fields: DraftFields;
  body: string;
};

type EditState = { title: string; description: string; status: string; body: string };

const STATUSES = ["draft", "review", "published"];

function Drafts({ session, onBack }: { session: Session; onBack: () => void }) {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DraftFile | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [edit, setEdit] = useState<EditState>({ title: "", description: "", status: "draft", body: "" });
  const [saving, setSaving] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [merged, setMerged] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    callFunction("admin-generate-content", session, {
      method: "POST",
      body: JSON.stringify({ action: "list-drafts" }),
    })
      .then((data) => setDrafts(data.drafts))
      .catch((e) => setError(String(e)));
  }, [session]);

  async function open(d: DraftSummary) {
    setLoadingId(d.number);
    setError(null);
    try {
      const data: DraftFile = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "read-draft", prNumber: d.number }),
      });
      setSelected(data);
      setEdit({
        title: data.fields.title,
        description: data.fields.description,
        status: data.fields.status,
        body: data.body,
      });
      setMode("preview");
      setMerged(false);
      setConfirmPublish(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingId(null);
    }
  }

  async function save(statusOverride?: string) {
    if (!selected) return false;
    setSaving(true);
    setError(null);
    try {
      const data: DraftFile = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({
          action: "update-draft",
          prNumber: selected.prNumber,
          title: edit.title,
          description: edit.description,
          status: statusOverride || edit.status,
          body: edit.body,
        }),
      });
      setSelected(data);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip le préfixe "data:...;base64," — l'API GitHub Contents veut
        // le base64 nu
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function insertImage(file: File) {
    if (!selected) return;
    setUploadingImage(true);
    setError(null);
    try {
      const dataBase64 = await fileToBase64(file);
      const data: { sitePath: string; rawUrl: string } = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({
          action: "upload-draft-image",
          prNumber: selected.prNumber,
          filename: file.name,
          dataBase64,
        }),
      });
      const snippet = `\n\n![](${data.sitePath})\n\n`;
      const ta = bodyRef.current;
      const pos = ta ? ta.selectionStart : edit.body.length;
      setEdit((f) => ({ ...f, body: f.body.slice(0, pos) + snippet + f.body.slice(pos) }));
    } catch (e) {
      setError(String(e));
    } finally {
      setUploadingImage(false);
    }
  }

  async function publish() {
    if (!selected) return;
    if (!confirmPublish) {
      setConfirmPublish(true);
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const ok = await save("published");
      if (!ok) return;
      await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "merge-draft", prNumber: selected.prNumber }),
      });
      setMerged(true);
      setDrafts((ds) => ds?.filter((d) => d.number !== selected.prNumber) ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setPublishing(false);
      setConfirmPublish(false);
    }
  }

  if (selected && merged) {
    return (
      <main className="panel">
        <p className="eyebrow">Publié</p>
        <h1>{edit.title}</h1>
        <p style={{ marginBottom: "1.25rem" }}>
          PR mergée, <code>status: published</code>. Le déploiement GitHub Actions rend l’article visible sur
          <code> /blog</code> d’ici 1 à 2 minutes.
        </p>
        <div className="actions">
          <a
            className="btn ghost"
            href="https://github.com/atrari-pro/studio-jannah/actions"
            target="_blank"
            rel="noreferrer"
          >
            Voir le déploiement
          </a>
          <button type="button" className="btn primary" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
        </div>
      </main>
    );
  }

  if (selected) {
    return (
      <main className="panel">
        <p className="eyebrow">Draft #{selected.prNumber}</p>
        <div className="options options--row" role="list" style={{ marginBottom: "1.25rem" }}>
          <button
            type="button"
            className="option"
            style={mode === "preview" ? { borderColor: "var(--sj-garden-bright)" } : undefined}
            onClick={() => setMode("preview")}
          >
            Aperçu
          </button>
          <button
            type="button"
            className="option"
            style={mode === "edit" ? { borderColor: "var(--sj-garden-bright)" } : undefined}
            onClick={() => setMode("edit")}
          >
            Modifier
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {mode === "preview" ? (
          <ArticlePreview
            title={edit.title}
            description={edit.description}
            hook={selected.fields.hook}
            tags={selected.fields.tags.length ? selected.fields.tags : selected.fields.themes}
            status={edit.status}
            body={edit.body}
            headRef={selected.headRef}
          />
        ) : (
          <div>
            <p className="hint">Titre</p>
            <input
              className="field"
              value={edit.title}
              onChange={(e) => setEdit((f) => ({ ...f, title: e.target.value }))}
            />
            <p className="hint">Description</p>
            <input
              className="field"
              value={edit.description}
              onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))}
            />
            <p className="hint">Statut</p>
            <select
              className="field"
              value={edit.status}
              onChange={(e) => setEdit((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="hint">Corps (Markdown)</p>
            <div style={{ display: "flex", gap: "0.65rem", marginBottom: "0.5rem" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? "Envoi…" : "🖼️ Insérer une image ici"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) insertImage(file);
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              ref={bodyRef}
              className="field textarea"
              rows={14}
              value={edit.body}
              onChange={(e) => setEdit((f) => ({ ...f, body: e.target.value }))}
            />
            <p className="hint">
              Le curseur dans le texte ci-dessus détermine où l’image s’insère. Une image seule reste en pleine
              largeur, 2 images ou plus à la suite (sans texte entre) se regroupent en galerie.
            </p>
            <div className="actions" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn primary"
                onClick={async () => {
                  if (await save()) setMode("preview");
                }}
                disabled={saving}
              >
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}

        <div className="actions" style={{ marginTop: "1.25rem" }}>
          {!confirmPublish ? (
            <button type="button" className="btn primary" onClick={publish} disabled={publishing}>
              Publier en prod
            </button>
          ) : (
            <>
              <p className="hint">
                Ça enregistre <code>status: published</code>, merge la PR et déclenche le déploiement. Confirmer ?
              </p>
              <button type="button" className="btn primary" onClick={publish} disabled={publishing}>
                {publishing ? "…" : "Oui, publier"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmPublish(false)}>
                Annuler
              </button>
            </>
          )}
          <p className="foot" style={{ textAlign: "left" }}>
            <a href={selected.prUrl} target="_blank" rel="noreferrer">
              {selected.prUrl}
            </a>
          </p>
          <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="panel">
      <p className="eyebrow">Drafts</p>
      <h1>{drafts ? `${drafts.length} draft${drafts.length > 1 ? "s" : ""} en attente` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}
      {drafts && drafts.length > 1 && (
        <input
          className="field"
          style={{ marginBottom: "1rem" }}
          placeholder="Rechercher un titre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="options" role="list">
        {drafts
          ?.filter((d) => !query.trim() || d.title.toLowerCase().includes(query.trim().toLowerCase()))
          .map((d) => (
            <div key={d.number} className="option" style={{ display: "grid", gap: "0.35rem" }}>
              <button
                type="button"
                onClick={() => open(d)}
                disabled={loadingId === d.number}
                style={{ background: "none", border: 0, padding: 0, textAlign: "left", color: "inherit", font: "inherit", cursor: "pointer" }}
              >
                <strong>{d.title}</strong> — {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                {loadingId === d.number ? " · chargement…" : ""}
              </button>
              <div>
                <a className="btn ghost" href={d.htmlUrl} target="_blank" rel="noreferrer">
                  Voir sur GitHub ↗
                </a>
              </div>
            </div>
          ))}
        {drafts && drafts.length === 0 && <p>Aucun draft en attente.</p>}
      </div>
      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </main>
  );
}

// --- Articles publiés (déjà sur main) ---------------------------------
// Reprendre la main sur du contenu déjà en ligne : lister, relire, éditer
// (via une PR — même garde-fou de revue que les drafts, "Fusionner" merge
// le correctif), dépublier ou supprimer (direct sur main, sans PR : ce sont
// des actions qui réduisent l'exposition, la vitesse prime dans ce sens-là
// — voir docs/ADMIN_LEADS.md).

type PublishedSummary = { path: string; type: "insight" | "use-case"; title: string; status: string };

type PublishedFields = {
  title: string;
  description: string;
  status: string;
  hook: string;
  rubrique: string;
  sector: string;
  complexity: string;
  tags: string[];
  themes: string[];
};

type PublishedRead = { path: string; headRef: string; prUrl: string; fields: PublishedFields; body: string };

type EditSession = { path: string; branch: string; prNumber: number | null; prUrl: string | null };

function PublishedArticles({ session, onBack }: { session: Session; onBack: () => void }) {
  const [items, setItems] = useState<PublishedSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"" | "insight" | "use-case">("");
  const [query, setQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [selected, setSelected] = useState<PublishedSummary | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [headRef, setHeadRef] = useState("main");
  const [edit, setEdit] = useState<EditState>({ title: "", description: "", status: "draft", body: "" });
  const [fields, setFields] = useState<PublishedFields | null>(null);
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  const [saving, setSaving] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    callFunction("admin-generate-content", session, {
      method: "POST",
      body: JSON.stringify({ action: "list-published" }),
    })
      .then((data) => setItems(data.items))
      .catch((e) => setError(String(e)));
  }, [session]);

  async function open(item: PublishedSummary) {
    setLoadingPath(item.path);
    setError(null);
    try {
      const data: PublishedRead = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "read-published", path: item.path }),
      });
      setSelected(item);
      setFields(data.fields);
      setHeadRef(data.headRef);
      setEdit({ title: data.fields.title, description: data.fields.description, status: data.fields.status, body: data.body });
      setEditSession(null);
      setMode("preview");
      setMerged(false);
      setConfirmMerge(false);
      setConfirmUnpublish(false);
      setConfirmDelete(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingPath(null);
    }
  }

  async function startEdit() {
    if (!selected) return;
    setBusyAction(true);
    setError(null);
    try {
      const data: PublishedRead & { branch: string; prNumber: number | null } = await callFunction(
        "admin-generate-content",
        session,
        { method: "POST", body: JSON.stringify({ action: "start-edit", path: selected.path }) },
      );
      setEditSession({ path: data.path, branch: data.branch, prNumber: data.prNumber, prUrl: null });
      setHeadRef(data.branch);
      setEdit({ title: data.fields.title, description: data.fields.description, status: data.fields.status, body: data.body });
      setMode("edit");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyAction(false);
    }
  }

  async function saveEdit() {
    if (!editSession) return;
    setSaving(true);
    setError(null);
    try {
      const data: EditSession = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({
          action: "save-edit",
          path: editSession.path,
          branch: editSession.branch,
          prNumber: editSession.prNumber,
          title: edit.title,
          description: edit.description,
          status: edit.status,
          body: edit.body,
        }),
      });
      setEditSession(data);
      setMode("preview");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function merge() {
    if (!editSession?.prNumber) return;
    if (!confirmMerge) {
      setConfirmMerge(true);
      return;
    }
    setMerging(true);
    setError(null);
    try {
      await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "merge-draft", prNumber: editSession.prNumber }),
      });
      setMerged(true);
      setItems((prev) =>
        prev?.map((i) => (i.path === editSession.path ? { ...i, title: edit.title, status: edit.status } : i)) ?? null,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setMerging(false);
      setConfirmMerge(false);
    }
  }

  async function unpublish() {
    if (!selected) return;
    if (!confirmUnpublish) {
      setConfirmUnpublish(true);
      return;
    }
    setBusyAction(true);
    setError(null);
    try {
      await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "unpublish", path: selected.path }),
      });
      setEdit((f) => ({ ...f, status: "draft" }));
      setItems((prev) => prev?.map((i) => (i.path === selected.path ? { ...i, status: "draft" } : i)) ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyAction(false);
      setConfirmUnpublish(false);
    }
  }

  async function deleteArticle() {
    if (!selected) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusyAction(true);
    setError(null);
    try {
      await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "delete-published", path: selected.path }),
      });
      setItems((prev) => prev?.filter((i) => i.path !== selected.path) ?? null);
      setSelected(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyAction(false);
      setConfirmDelete(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function insertImage(file: File) {
    // upload-image-to-branch (pas upload-draft-image) : la branche existe
    // déjà dès "Modifier" (startEdit), pas besoin d'attendre qu'une PR soit
    // ouverte (elle ne l'est qu'au premier "Enregistrer", voir saveEdit).
    if (!editSession) return;
    setUploadingImage(true);
    setError(null);
    try {
      const dataBase64 = await fileToBase64(file);
      const data: { sitePath: string } = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({
          action: "upload-image-to-branch",
          branch: editSession.branch,
          path: editSession.path,
          filename: file.name,
          dataBase64,
        }),
      });
      const snippet = `\n\n![](${data.sitePath})\n\n`;
      const ta = bodyRef.current;
      const pos = ta ? ta.selectionStart : edit.body.length;
      setEdit((f) => ({ ...f, body: f.body.slice(0, pos) + snippet + f.body.slice(pos) }));
    } catch (e) {
      setError(String(e));
    } finally {
      setUploadingImage(false);
    }
  }

  if (selected && merged) {
    return (
      <main className="panel">
        <p className="eyebrow">Correctif publié</p>
        <h1>{edit.title}</h1>
        <p style={{ marginBottom: "1.25rem" }}>
          PR mergée — le déploiement GitHub Actions applique le correctif d’ici 1 à 2 minutes.
        </p>
        <div className="actions">
          <a
            className="btn ghost"
            href="https://github.com/atrari-pro/studio-jannah/actions"
            target="_blank"
            rel="noreferrer"
          >
            Voir le déploiement
          </a>
          <button type="button" className="btn primary" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
        </div>
      </main>
    );
  }

  if (selected) {
    return (
      <main className="panel">
        <p className="eyebrow">
          {selected.type === "insight" ? "Insight" : "Use case"} · {edit.status}
        </p>
        <div className="options options--row" role="list" style={{ marginBottom: "1.25rem" }}>
          <button
            type="button"
            className="option"
            style={mode === "preview" ? { borderColor: "var(--sj-garden-bright)" } : undefined}
            onClick={() => setMode("preview")}
          >
            Aperçu
          </button>
          <button
            type="button"
            className="option"
            onClick={editSession ? () => setMode("edit") : startEdit}
            disabled={busyAction}
          >
            {editSession ? "Modifier" : busyAction ? "…" : "Modifier"}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {mode === "preview" ? (
          <ArticlePreview
            title={edit.title}
            description={edit.description}
            hook={fields?.hook}
            tags={fields ? (fields.tags.length ? fields.tags : fields.themes) : []}
            status={edit.status}
            body={edit.body}
            headRef={headRef}
          />
        ) : (
          <div>
            <p className="hint">Titre</p>
            <input
              className="field"
              value={edit.title}
              onChange={(e) => setEdit((f) => ({ ...f, title: e.target.value }))}
            />
            <p className="hint">Description</p>
            <input
              className="field"
              value={edit.description}
              onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))}
            />
            <p className="hint">Statut</p>
            <select
              className="field"
              value={edit.status}
              onChange={(e) => setEdit((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="hint">Corps (Markdown)</p>
            <div style={{ display: "flex", gap: "0.65rem", marginBottom: "0.5rem" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? "Envoi…" : "🖼️ Insérer une image ici"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) insertImage(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="hint">
              Le curseur dans le texte ci-dessous détermine où l’image s’insère. Pour remplacer une image déjà
              insérée : supprime sa ligne <code>![](...)</code> dans le texte, puis insère la nouvelle.
            </p>
            <textarea
              ref={bodyRef}
              className="field textarea"
              rows={14}
              value={edit.body}
              onChange={(e) => setEdit((f) => ({ ...f, body: e.target.value }))}
            />
            <div className="actions" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="btn primary" onClick={saveEdit} disabled={saving}>
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}

        {editSession?.prNumber && (
          <div className="actions" style={{ marginTop: "1.25rem" }}>
            {!confirmMerge ? (
              <button type="button" className="btn primary" onClick={merge} disabled={merging}>
                Fusionner (republier le correctif)
              </button>
            ) : (
              <>
                <p className="hint">Ça merge la PR de correctif et déclenche le déploiement. Confirmer ?</p>
                <button type="button" className="btn primary" onClick={merge} disabled={merging}>
                  {merging ? "…" : "Oui, fusionner"}
                </button>
                <button type="button" className="btn ghost" onClick={() => setConfirmMerge(false)}>
                  Annuler
                </button>
              </>
            )}
            <p className="foot" style={{ textAlign: "left" }}>
              PR de correctif :{" "}
              <a href={`https://github.com/atrari-pro/studio-jannah/pull/${editSession.prNumber}`} target="_blank" rel="noreferrer">
                #{editSession.prNumber}
              </a>
            </p>
          </div>
        )}

        <div className="actions" style={{ marginTop: "1.25rem" }}>
          {edit.status === "published" && !confirmUnpublish && (
            <button type="button" className="btn ghost" onClick={unpublish} disabled={busyAction}>
              Dépublier
            </button>
          )}
          {confirmUnpublish && (
            <>
              <p className="hint">Repasse l’article en draft immédiatement (invisible sur le site). Confirmer ?</p>
              <button type="button" className="btn primary" onClick={unpublish} disabled={busyAction}>
                {busyAction ? "…" : "Oui, dépublier"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmUnpublish(false)}>
                Annuler
              </button>
            </>
          )}
          {!confirmDelete ? (
            <button type="button" className="btn ghost" onClick={deleteArticle} disabled={busyAction}>
              Supprimer
            </button>
          ) : (
            <>
              <p className="hint">
                Supprime le fichier et ses images du repo (main, sans PR). L’historique git garde une trace — voir
                docs/ADMIN_LEADS.md si besoin de purge complète. Confirmer ?
              </p>
              <button type="button" className="btn primary" onClick={deleteArticle} disabled={busyAction}>
                {busyAction ? "…" : "Oui, supprimer"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
            </>
          )}
        </div>

        <div className="actions" style={{ marginTop: "1.25rem" }}>
          <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
        </div>
      </main>
    );
  }

  const visibleItems = items?.filter((i) => {
    const matchType = !typeFilter || i.type === typeFilter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || i.title.toLowerCase().includes(q);
    return matchType && matchQuery;
  });

  return (
    <main className="panel">
      <p className="eyebrow">Articles publiés</p>
      <h1>{items ? `${items.length} article${items.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}

      {items && items.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="options options--row" role="list">
            {(
              [
                { value: "", label: "Tous" },
                { value: "insight", label: "Insights" },
                { value: "use-case", label: "Use cases" },
              ] as const
            ).map((f) => (
              <button
                key={f.value}
                type="button"
                className="option"
                style={typeFilter === f.value ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label} ({f.value ? items.filter((i) => i.type === f.value).length : items.length})
              </button>
            ))}
          </div>
          <input
            className="field"
            style={{ marginTop: "0.75rem" }}
            placeholder="Rechercher un titre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className="options" role="list">
        {visibleItems?.map((i) => (
          <button
            key={i.path}
            type="button"
            className="option"
            onClick={() => open(i)}
            disabled={loadingPath === i.path}
          >
            <strong>{i.title}</strong> — {i.status}
            {loadingPath === i.path ? " · chargement…" : ""}
          </button>
        ))}
        {items && items.length === 0 && <p>Aucun contenu pour l’instant.</p>}
        {items && items.length > 0 && visibleItems?.length === 0 && <p>Aucun article pour ce filtre.</p>}
      </div>
      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="btn primary"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Retour en haut"
          style={{
            position: "fixed",
            right: "1.25rem",
            bottom: "1.25rem",
            borderRadius: "999px",
            width: "3rem",
            height: "3rem",
            padding: 0,
            zIndex: 30,
          }}
        >
          ↑
        </button>
      )}
    </main>
  );
}

// --- Preview iso article (reproduit le style de /blog/[slug], site statique
// donc pas de route réelle à afficher — voir docs/ADMIN_LEADS.md) ---------

// Même règle de regroupement en galerie que rehype-article-images.mjs côté
// apps/web (1 image = inchangée, 2+ consécutives = galerie selon leur
// nombre) — dupliquée ici en JS/DOM navigateur, impossible de partager le
// plugin Node/HAST avec du code qui tourne dans le navigateur. Si la règle
// change là-bas, la changer ici aussi pour que la preview reste iso.
function isImageOnlyParagraph(el: Element): boolean {
  if (el.tagName !== "P") return false;
  const kids = Array.from(el.childNodes).filter(
    (n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()),
  );
  return kids.length === 1 && kids[0].nodeType === Node.ELEMENT_NODE && (kids[0] as Element).tagName === "IMG";
}

function groupGalleries(doc: Document, container: Element) {
  const children = Array.from(container.children);
  const next: Element[] = [];
  let run: Element[] = [];
  const flush = () => {
    if (run.length === 0) return;
    if (run.length === 1) {
      next.push(run[0]);
    } else {
      const gallery = doc.createElement("div");
      gallery.className = `article-gallery article-gallery--${Math.min(run.length, 4)}`;
      run.forEach((p) => {
        const figure = doc.createElement("figure");
        figure.className = "article-figure";
        figure.innerHTML = p.innerHTML;
        gallery.appendChild(figure);
      });
      next.push(gallery);
    }
    run = [];
  };
  for (const child of children) {
    if (isImageOnlyParagraph(child)) run.push(child);
    else {
      flush();
      next.push(child);
    }
  }
  flush();
  container.replaceChildren(...next);
}

// Résout le body Markdown en HTML pour la preview : chemins d'image locaux
// (![alt](/mag/...), produits par insertImage côté Drafts) → URL brute
// GitHub de la branche de la PR, seul moyen de les voir avant merge (le
// site déployé ne les sert pas encore à cette URL).
function renderArticleBody(markdown: string, headRef: string): string {
  const html = marked.parse(markdown || "", { async: false }) as string;
  if (typeof window === "undefined" || !window.DOMParser) return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const container = doc.body.firstElementChild;
  if (!container) return html;

  container.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (src && !/^([a-z]+:)?\/\//i.test(src) && !src.startsWith("data:")) {
      // src est site-relatif (/mag/...) — les fichiers vivent réellement
      // sous apps/web/public/mag/... dans le repo, il faut ce préfixe pour
      // que raw.githubusercontent.com les serve.
      img.setAttribute(
        "src",
        `https://raw.githubusercontent.com/atrari-pro/studio-jannah/${headRef}/apps/web/public${src}`,
      );
    }
  });

  groupGalleries(doc, container);
  return container.innerHTML;
}

function ArticlePreview({
  title,
  description,
  hook,
  tags,
  status,
  body,
  headRef,
}: {
  title: string;
  description: string;
  hook?: string;
  tags: string[];
  status: string;
  body: string;
  headRef: string;
}) {
  const html = useMemo(() => renderArticleBody(body, headRef), [body, headRef]);
  return (
    <div className="article-preview">
      <p className="article-preview__eyebrow">
        Blog <span className={`status-pill status-${status}`}>{status}</span>
      </p>
      <h1>{title || "(sans titre)"}</h1>
      {hook && <p className="article-preview__hook">{hook}</p>}
      {description && <p className="article-preview__meta">{description}</p>}
      {tags.length > 0 && <p className="article-preview__meta">{tags.join(" · ")}</p>}
      <div className="article-preview__body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function StepOptions({
  title,
  options,
  onPick,
}: {
  title: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="options" role="list">
        {options.map((o) => (
          <button key={o.value} type="button" className="option" onClick={() => onPick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepNav({ onNext, disabled }: { onNext: () => void; disabled?: boolean }) {
  return (
    <div className="actions" style={{ marginTop: "1rem" }}>
      <button type="button" className="btn primary" onClick={onNext} disabled={disabled}>
        Suivant
      </button>
    </div>
  );
}
