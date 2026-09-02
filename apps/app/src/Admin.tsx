import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { marked } from "marked";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { CalendarDays, CircleCheck, Flame, ListTodo, Pause, Pencil, Plus, Target, Trash2 } from "lucide-react";
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

// --- Tâches (ponctuel) + Objectifs (cadence) --------------------------

type Task = {
  id: string;
  project: string;
  title: string;
  start_date: string;
  end_date: string;
  status: "a_faire" | "en_cours" | "fait";
  notes: string | null;
  created_at: string;
};

const TASK_STATUSES: Task["status"][] = ["a_faire", "en_cours", "fait"];
const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};

const OBJECTIVE_STATUSES: Objective["status"][] = ["actif", "pause", "termine"];
const OBJECTIVE_STATUS_LABEL: Record<Objective["status"], string> = {
  actif: "Actif",
  pause: "En pause",
  termine: "Terminé",
};

type Objective = {
  id: string;
  project: string;
  title: string;
  start_date: string;
  end_date: string | null;
  target_per_week: number;
  status: "actif" | "pause" | "termine";
  notes: string | null;
  created_at: string;
};

type ObjectiveCheckin = {
  id: string;
  objective_id: string;
  date: string;
  note: string | null;
  created_at: string;
};

type ObjectiveScoreStatus = "pas_commence" | "avance" | "a_jour" | "retard";

// Calcul pur, jamais stocké — recalculé à chaque affichage pour une date de
// référence donnée. Plafonné à end_date si l'objectif est déjà terminé
// (sinon "attendu" continuerait de grimper indéfiniment après la fin).
function computeObjectiveScore(
  objective: Objective,
  checkins: ObjectiveCheckin[],
  referenceDate: string,
): { percent: number; expected: number; actual: number; status: ObjectiveScoreStatus } {
  const capped = objective.end_date && objective.end_date < referenceDate ? objective.end_date : referenceDate;
  if (capped < objective.start_date) {
    return { percent: 0, expected: 0, actual: 0, status: "pas_commence" };
  }
  const start = new Date(`${objective.start_date}T00:00:00`);
  const ref = new Date(`${capped}T00:00:00`);
  const daysElapsed = Math.round((ref.getTime() - start.getTime()) / 86400000) + 1;
  const weeksElapsed = daysElapsed / 7;
  const expected = objective.target_per_week * weeksElapsed;
  const actual = checkins.filter(
    (c) => c.objective_id === objective.id && c.date >= objective.start_date && c.date <= capped,
  ).length;
  const percent = expected > 0.01 ? Math.round((actual / expected) * 100) : actual > 0 ? 100 : 0;
  const status: ObjectiveScoreStatus = percent > 105 ? "avance" : percent < 95 ? "retard" : "a_jour";
  return { percent, expected: Math.round(expected * 10) / 10, actual, status };
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

// Données pour react-activity-calendar (heatmap type "contributions GitHub").
// Sparse : seuls le premier jour, le dernier jour et les jours réellement
// pointés sont listés — la lib comble les trous en "aucune activité"
// (documenté dans ses props). Binaire fait/pas fait → level 0 ou 4.
function buildActivityData(objective: Objective, checkins: ObjectiveCheckin[]): Activity[] {
  const end = objective.end_date && objective.end_date < todayISO() ? objective.end_date : todayISO();
  const byDate = new Map<string, number>([
    [objective.start_date, 0],
    [end, 0],
  ]);
  for (const c of checkins) {
    if (c.objective_id === objective.id && c.date >= objective.start_date && c.date <= end) {
      byDate.set(c.date, 1);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count, level: count > 0 ? 4 : 0 }));
}

// Anneau de score SVG — pas de lib pour ça, un cercle avec stroke-dasharray
// suffit et reste cohérent avec les tokens du design system.
function ScoreRing({ percent, status }: { percent: number; status: ObjectiveScoreStatus }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = Math.min(Math.max(percent, 0) / 100, 1);
  const offset = circumference * (1 - fillRatio);
  const color =
    status === "avance"
      ? "var(--sj-garden-bright)"
      : status === "retard"
        ? "#ff9b9b"
        : status === "pas_commence"
          ? "var(--sj-muted)"
          : "var(--sj-signal)";
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: "block", flexShrink: 0 }}>
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="color-mix(in oklab, var(--sj-paper) 12%, transparent)"
        strokeWidth="10"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x="60" y="67" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--sj-paper)">
        {percent}%
      </text>
    </svg>
  );
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
    | "menu"
    | "veille"
    | "leads"
    | "content"
    | "drafts"
    | "published"
    | "simulateur"
    | "tracking-score"
    | "tasks"
    | "objectives"
  >("menu");
  // Pré-remplissage du wizard "Publier un contenu" depuis un article de la
  // veille RSS (bouton "Générer un draft" dans Veille) — null quand on
  // arrive sur le wizard par le menu normal.
  const [contentPrefill, setContentPrefill] = useState<Partial<ContentForm> | null>(null);

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
    <AdminShell session={session} onLogout={logout}>
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
      {view === "leads" && <Leads session={session} onBack={() => setView("menu")} />}
      {view === "drafts" && <Drafts session={session} onBack={() => setView("menu")} />}
      {view === "published" && <PublishedArticles session={session} onBack={() => setView("menu")} />}
      {view === "simulateur" && <MigrationSimulator onBack={() => setView("menu")} />}
      {view === "tracking-score" && <TrackingScoreInfo onBack={() => setView("menu")} />}
      {view === "content" && <Content session={session} onBack={() => setView("menu")} prefill={contentPrefill} />}
      {view === "tasks" && <Tasks session={session} onBack={() => setView("menu")} />}
      {view === "objectives" && <Objectives session={session} onBack={() => setView("menu")} />}
    </AdminShell>
  );
}

// --- Coquille : header persistant (retour site, session) -----------------

function AdminShell({
  session,
  onLogout,
  children,
}: {
  session?: Session;
  onLogout?: () => void;
  children: React.ReactNode;
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
      <div className="admin-main">{children}</div>
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

const PLANNING_ITEMS = [
  {
    value: "tasks",
    icon: "🗓️",
    title: "Tâches",
    text: "Tâches ponctuelles (début/fin, statut) sur une frise mensuelle.",
  },
  {
    value: "objectives",
    icon: "📈",
    title: "Objectifs",
    text: "Cadence à tenir par projet, pointage quotidien, score avance/retard.",
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
    v:
      | "veille"
      | "leads"
      | "content"
      | "drafts"
      | "published"
      | "simulateur"
      | "tracking-score"
      | "tasks"
      | "objectives",
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

      <p className="menu-section-label">Tâches &amp; objectifs</p>
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

function Leads({ session, onBack }: { session: Session; onBack: () => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    callFunction("admin-leads", session)
      .then((data) => setLeads(data.leads))
      .catch((e) => setError(String(e)));
  }, [session]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function saveStatus(status: string, notes: string) {
    if (!selected) return;
    await callFunction("admin-leads", session, {
      method: "PATCH",
      body: JSON.stringify({ id: selected.id, status, notes }),
    });
    setLeads((prev) => prev?.map((l) => (l.id === selected.id ? { ...l, status, notes } : l)) ?? null);
    setSelected(null);
  }

  if (selected) {
    return (
      <main className="panel">
        <p className="eyebrow">Lead</p>
        <h1>{selected.name}</h1>
        <p className="foot" style={{ textAlign: "left", marginBottom: "1rem" }}>
          {selected.email} · {new Date(selected.created_at).toLocaleDateString("fr-FR")}
        </p>
        <p style={{ marginBottom: "1.25rem" }}>{selected.message}</p>
        <LeadStatusForm lead={selected} onSave={saveStatus} onCancel={() => setSelected(null)} />
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
          <div className="options" role="list" style={{ gridAutoFlow: "column", gridAutoColumns: "max-content" }}>
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

      <div className="options" role="list">
        {visibleLeads?.map((l) => (
          <div key={l.id} className="option" style={{ display: "grid", gap: "0.35rem" }}>
            <button
              type="button"
              onClick={() => setSelected(l)}
              style={{ background: "none", border: 0, padding: 0, textAlign: "left", color: "inherit", font: "inherit", cursor: "pointer" }}
            >
              <strong>{l.name}</strong> — {l.status || "nouveau"}
              <span className="hint" style={{ display: "block", margin: "0.2rem 0 0" }}>
                {l.email} · {new Date(l.created_at).toLocaleDateString("fr-FR")}
              </span>
            </button>
            <div>
              <a className="btn ghost" href={`mailto:${l.email}`} onClick={(e) => e.stopPropagation()}>
                ✉ Répondre
              </a>
            </div>
          </div>
        ))}
        {leads && leads.length === 0 && <p>Aucun lead pour l’instant.</p>}
        {leads && leads.length > 0 && visibleLeads?.length === 0 && <p>Aucun lead pour ce filtre.</p>}
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

function LeadStatusForm({
  lead,
  onSave,
  onCancel,
}: {
  lead: Lead;
  onSave: (status: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(lead.status || "nouveau");
  const [notes, setNotes] = useState(lead.notes || "");

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
      <textarea
        className="field textarea"
        placeholder="Notes internes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
      />
      <div className="actions" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn primary" onClick={() => onSave(status, notes)}>
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
          <div className="options" role="list" style={{ gridAutoFlow: "column", gridAutoColumns: "max-content" }}>
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

const EMPTY_TASK_FORM = { project: "", title: "", start_date: todayISO(), end_date: todayISO(), notes: "" };

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

function TaskTimeline({ tasks, onSelect }: { tasks: Task[]; onSelect: (task: Task) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
                  style={{
                    width: g.span * TIMELINE_DAY_WIDTH,
                    flex: "none",
                    padding: "0.5rem 0.6rem",
                    fontSize: "0.78rem",
                    fontWeight: 650,
                    color: "var(--sj-paper)",
                    borderRight: "1px solid color-mix(in oklab, var(--sj-paper) 10%, transparent)",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
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
            {tasks.map((t) => {
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
                    style={{ left, width }}
                    title={`${t.title} · ${t.project} · ${formatDateFR(t.start_date)} → ${formatDateFR(t.end_date)}`}
                    onClick={() => onSelect(t)}
                  >
                    {t.title}
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

function Tasks({ session, onBack }: { session: Session; onBack: () => void }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Task["status"]>("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK_FORM);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await callFunction("admin-tasks", session);
      setTasks(data.tasks);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project.trim() || !form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-tasks", session, {
        method: "POST",
        body: JSON.stringify({ ...form, status: "a_faire" }),
      });
      setForm(EMPTY_TASK_FORM);
      setShowForm(false);
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
      setSelected(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const projects = tasks ? [...new Set(tasks.map((t) => t.project))].sort((a, b) => a.localeCompare(b)) : [];
  const visibleTasks = tasks?.filter((t) => {
    const matchProject = !projectFilter || t.project === projectFilter;
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchProject && matchStatus;
  });
  if (selected) {
    async function saveEdit(e: React.FormEvent) {
      e.preventDefault();
      if (!selected || !editForm.project.trim() || !editForm.title.trim()) return;
      await patchTask(selected.id, editForm);
      setEditing(false);
      setSelected(null);
    }

    return (
      <main className="panel">
        <p className="eyebrow">Tâche</p>
        {editing ? (
          <form onSubmit={saveEdit} style={{ marginTop: "0.5rem", display: "grid", gap: "0.65rem" }}>
            <input
              className="field"
              placeholder="Projet"
              value={editForm.project}
              onChange={(e) => setEditForm((f) => ({ ...f, project: e.target.value }))}
              required
            />
            <input
              className="field"
              placeholder="Titre de la tâche"
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <div style={{ display: "flex", gap: "0.65rem" }}>
              <input
                className="field"
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
              <input
                className="field"
                type="date"
                value={editForm.end_date}
                min={editForm.start_date}
                onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                required
              />
            </div>
            <div className="actions">
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "…" : "Enregistrer"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1>{selected.title}</h1>
            <p className="hint">
              {selected.project} · {formatDateFR(selected.start_date)} → {formatDateFR(selected.end_date)}
            </p>
          </>
        )}
        {error && <p className="error">{error}</p>}

        {!editing && (
          <>
            <p className="hint" style={{ marginTop: "1rem" }}>
              Statut
            </p>
            <div className="options" role="list" style={{ gridAutoFlow: "column", gridAutoColumns: "max-content" }}>
              {TASK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="option"
                  style={selected.status === s ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                  onClick={() => {
                    patchTask(selected.id, { status: s });
                    setSelected(null);
                  }}
                  disabled={saving}
                >
                  {TASK_STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            <div className="actions" style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditForm({
                    project: selected.project,
                    title: selected.title,
                    start_date: selected.start_date,
                    end_date: selected.end_date,
                    notes: selected.notes ?? "",
                  });
                  setEditing(true);
                }}
              >
                <Pencil size={16} /> Modifier
              </button>
              <button type="button" className="btn ghost" onClick={() => deleteTask(selected.id)} disabled={saving}>
                <Trash2 size={16} /> Supprimer
              </button>
              <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
                ← Retour à la liste
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="panel">
      <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <ListTodo size={14} /> Tâches
      </p>
      <h1>{tasks ? `${tasks.length} tâche${tasks.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}

      <div className="actions" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> {showForm ? "Annuler" : "Nouvelle tâche"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
          <input
            className="field"
            placeholder="Projet"
            value={form.project}
            onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
            required
          />
          <input
            className="field"
            placeholder="Titre de la tâche"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <div style={{ display: "flex", gap: "0.65rem" }}>
            <input
              className="field"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              required
            />
            <input
              className="field"
              type="date"
              value={form.end_date}
              min={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "…" : "Créer"}
          </button>
        </form>
      )}

      {tasks && tasks.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="options" role="list" style={{ gridAutoFlow: "column", gridAutoColumns: "max-content" }}>
            <button
              type="button"
              className="option"
              style={!statusFilter ? { borderColor: "var(--sj-garden-bright)" } : undefined}
              onClick={() => setStatusFilter("")}
            >
              Tous
            </button>
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="option"
                style={statusFilter === s ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                onClick={() => setStatusFilter(s)}
              >
                {TASK_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {projects.length > 1 && (
            <select
              className="field"
              style={{ marginTop: "0.75rem" }}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">Tous les projets</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Frise maison (TaskTimeline) — une plage continue couvrant toutes les tâches, scroll horizontal + bouton "Aujourd'hui". */}
      <div style={{ marginTop: "1.5rem" }}>
        <TaskTimeline
          tasks={visibleTasks ?? []}
          onSelect={(t) => {
            setEditing(false);
            setSelected(t);
          }}
        />
      </div>

      <div className="actions" style={{ marginTop: "1.5rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </main>
  );
}

// --- Objectifs (cadence, pointage quotidien, score) --------------------

const EMPTY_OBJECTIVE_FORM = { project: "", title: "", start_date: todayISO(), end_date: "", target_per_week: 6 };

function Objectives({ session, onBack }: { session: Session; onBack: () => void }) {
  const [objectives, setObjectives] = useState<Objective[] | null>(null);
  const [checkins, setCheckins] = useState<ObjectiveCheckin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refDate, setRefDate] = useState(todayISO());
  const [sortBy, setSortBy] = useState<"score" | "date">("date");
  const [selected, setSelected] = useState<Objective | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_OBJECTIVE_FORM);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_OBJECTIVE_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await callFunction("admin-objectives", session);
      setObjectives(data.objectives);
      setCheckins(data.checkins);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function createObjective(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project.trim() || !form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-objectives", session, {
        method: "POST",
        body: JSON.stringify({
          action: "create-objective",
          project: form.project,
          title: form.title,
          start_date: form.start_date,
          end_date: form.end_date || null,
          target_per_week: Number(form.target_per_week),
        }),
      });
      setForm(EMPTY_OBJECTIVE_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateObjective(id: string, fields: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-objectives", session, {
        method: "POST",
        body: JSON.stringify({ action: "update-objective", id, ...fields }),
      });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteObjective(id: string) {
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-objectives", session, {
        method: "POST",
        body: JSON.stringify({ action: "delete-objective", id }),
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCheckin(objectiveId: string, date: string, alreadyDone: boolean) {
    setSaving(true);
    setError(null);
    try {
      await callFunction("admin-objectives", session, {
        method: "POST",
        body: JSON.stringify(
          alreadyDone
            ? { action: "uncheckin", objective_id: objectiveId, date }
            : { action: "checkin", objective_id: objectiveId, date },
        ),
      });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const scored = (objectives ?? []).map((o) => ({ objective: o, score: computeObjectiveScore(o, checkins, refDate) }));
  const sorted = [...scored].sort((a, b) => {
    if (sortBy === "score") return a.score.percent - b.score.percent; // pire en premier — attire l'œil
    const aEnd = a.objective.end_date ?? "9999-99-99";
    const bEnd = b.objective.end_date ?? "9999-99-99";
    return aEnd.localeCompare(bEnd);
  });

  const STATUS_LABEL: Record<ObjectiveScoreStatus, string> = {
    pas_commence: "Pas commencé",
    avance: "En avance",
    a_jour: "À jour",
    retard: "En retard",
  };
  const STATUS_CLASS: Record<ObjectiveScoreStatus, string> = {
    pas_commence: "hors_scope",
    avance: "pertinent",
    a_jour: "pertinent",
    retard: "hors_scope",
  };

  if (selected) {
    const score = computeObjectiveScore(selected, checkins, refDate);
    const activityData = buildActivityData(selected, checkins);
    const rangeEnd = selected.end_date && selected.end_date < todayISO() ? selected.end_date : todayISO();

    async function saveEdit(e: React.FormEvent) {
      e.preventDefault();
      if (!selected || !editForm.project.trim() || !editForm.title.trim()) return;
      await updateObjective(selected.id, {
        project: editForm.project,
        title: editForm.title,
        start_date: editForm.start_date,
        end_date: editForm.end_date || null,
        target_per_week: Number(editForm.target_per_week),
      });
      setEditing(false);
      setSelected(null);
    }

    return (
      <main className="panel">
        <p className="eyebrow">{selected.project}</p>
        {editing ? (
          <form onSubmit={saveEdit} style={{ marginTop: "0.5rem", display: "grid", gap: "0.65rem" }}>
            <input
              className="field"
              placeholder="Projet"
              value={editForm.project}
              onChange={(e) => setEditForm((f) => ({ ...f, project: e.target.value }))}
              required
            />
            <input
              className="field"
              placeholder="Objectif"
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <div style={{ display: "flex", gap: "0.65rem" }}>
              <input
                className="field"
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
              <input
                className="field"
                type="date"
                placeholder="Fin (optionnel)"
                value={editForm.end_date}
                min={editForm.start_date}
                onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <label className="hint">
              Cadence cible : {editForm.target_per_week}x / semaine
              <input
                type="range"
                min={1}
                max={7}
                value={editForm.target_per_week}
                onChange={(e) => setEditForm((f) => ({ ...f, target_per_week: Number(e.target.value) }))}
                style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
              />
            </label>
            <div className="actions">
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "…" : "Enregistrer"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1>{selected.title}</h1>
            <p className="hint">
              Depuis le {formatDateFR(selected.start_date)}
              {selected.end_date ? ` jusqu'au ${formatDateFR(selected.end_date)}` : " · en continu"} ·{" "}
              {selected.target_per_week}x/semaine
            </p>
          </>
        )}
        {error && <p className="error">{error}</p>}

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
          <ScoreRing percent={score.percent} status={score.status} />
          <div>
            <span className={`status-pill status-${STATUS_CLASS[score.status]}`}>{STATUS_LABEL[score.status]}</span>
            <p className="hint" style={{ marginTop: "0.4rem" }}>
              {score.actual} pointage{score.actual > 1 ? "s" : ""} sur {score.expected} attendu
              {score.expected > 1 ? "s" : ""} au {formatDateFR(refDate)}
            </p>
          </div>
        </div>

        <p className="hint" style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <CalendarDays size={15} /> Historique complet — clique un jour (pas dans le futur) pour pointer/dépointer
        </p>
        <div className="activity-wrapper" style={{ marginTop: "0.5rem" }}>
          <ActivityCalendar
            data={activityData}
            colorScheme="dark"
            theme={{
              dark: ["color-mix(in oklab, var(--sj-paper) 8%, transparent)", "var(--sj-garden-bright)"],
            }}
            blockSize={13}
            blockMargin={4}
            fontSize={13}
            showWeekdayLabels
            labels={{
              totalCount: "{{count}} jour(s) pointé(s) sur la période",
              legend: { less: "Manqué", more: "Fait" },
            }}
            renderBlock={(block, activity) => {
              const clickable = activity.date >= selected.start_date && activity.date <= rangeEnd;
              return cloneElement(block, {
                onClick: () => clickable && !saving && toggleCheckin(selected.id, activity.date, activity.count > 0),
                style: { cursor: clickable ? "pointer" : "default" },
              });
            }}
          />
        </div>

        {!editing && (
          <>
            <p className="hint" style={{ marginTop: "1.5rem" }}>
              Statut de l'objectif
            </p>
            <div className="options" role="list" style={{ gridAutoFlow: "column", gridAutoColumns: "max-content" }}>
              {OBJECTIVE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="option"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    ...(selected.status === s ? { borderColor: "var(--sj-garden-bright)" } : undefined),
                  }}
                  onClick={() => updateObjective(selected.id, { status: s })}
                  disabled={saving}
                >
                  {s === "pause" && <Pause size={14} />}
                  {s === "termine" && <CircleCheck size={14} />}
                  {OBJECTIVE_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="actions" style={{ marginTop: "1.25rem" }}>
          {!editing && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditForm({
                  project: selected.project,
                  title: selected.title,
                  start_date: selected.start_date,
                  end_date: selected.end_date ?? "",
                  target_per_week: selected.target_per_week,
                });
                setEditing(true);
              }}
            >
              <Pencil size={16} /> Modifier
            </button>
          )}
          {!editing && (
            <button type="button" className="btn ghost" onClick={() => deleteObjective(selected.id)} disabled={saving}>
              <Trash2 size={16} /> Supprimer
            </button>
          )}
          <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="panel">
      <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Target size={14} /> Objectifs
      </p>
      <h1>{objectives ? `${objectives.length} objectif${objectives.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}

      <div className="actions" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> {showForm ? "Annuler" : "Nouvel objectif"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createObjective} style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
          <input
            className="field"
            placeholder="Projet"
            value={form.project}
            onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
            required
          />
          <input
            className="field"
            placeholder="Objectif (ex: Publication contenu LinkedIn)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <div style={{ display: "flex", gap: "0.65rem" }}>
            <input
              className="field"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              required
            />
            <input
              className="field"
              type="date"
              placeholder="Fin (optionnel)"
              value={form.end_date}
              min={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <label className="hint">
            Cadence cible : {form.target_per_week}x / semaine
            <input
              type="range"
              min={1}
              max={7}
              value={form.target_per_week}
              onChange={(e) => setForm((f) => ({ ...f, target_per_week: Number(e.target.value) }))}
              style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "…" : "Créer"}
          </button>
        </form>
      )}

      {objectives && objectives.length > 0 && (
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p className="hint" style={{ marginBottom: "0.35rem" }}>
              À la date du
            </p>
            <input className="field" type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
          </div>
          <div>
            <p className="hint" style={{ marginBottom: "0.35rem" }}>
              Trier par
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn ghost"
                style={sortBy === "date" ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                onClick={() => setSortBy("date")}
              >
                Échéance
              </button>
              <button
                type="button"
                className="btn ghost"
                style={sortBy === "score" ? { borderColor: "var(--sj-garden-bright)" } : undefined}
                onClick={() => setSortBy("score")}
              >
                Score
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="options" role="list" style={{ marginTop: "1rem" }}>
        {sorted.map(({ objective, score }) => (
          <button
            key={objective.id}
            type="button"
            className="option"
            onClick={() => {
              setEditing(false);
              setSelected(objective);
            }}
          >
            <strong>{objective.title}</strong> — {objective.project}
            <span className={`status-pill status-${STATUS_CLASS[score.status]}`} style={{ marginLeft: "0.5rem" }}>
              {score.status === "avance" && <Flame size={12} style={{ verticalAlign: "-2px" }} />}
              {score.status === "a_jour" && <CircleCheck size={12} style={{ verticalAlign: "-2px" }} />}
              {" "}
              {score.percent}% · {STATUS_LABEL[score.status]}
            </span>
            <span className="hint" style={{ display: "block", margin: "0.2rem 0 0" }}>
              {objective.target_per_week}x/semaine · depuis {formatDateFR(objective.start_date)}
              {objective.end_date ? ` · jusqu'au ${formatDateFR(objective.end_date)}` : ""}
            </span>
          </button>
        ))}
        {objectives && objectives.length === 0 && <p>Aucun objectif pour l’instant.</p>}
      </div>

      <div className="actions" style={{ marginTop: "1.5rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </main>
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
        <div className="options" role="list" style={{ gridAutoFlow: "column", marginBottom: "1.25rem" }}>
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
        <div className="options" role="list" style={{ gridAutoFlow: "column", marginBottom: "1.25rem" }}>
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
          <div className="options" role="list" style={{ gridAutoFlow: "column", gridAutoColumns: "max-content" }}>
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
