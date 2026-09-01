import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { marked } from "marked";
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
    "menu" | "veille" | "leads" | "content" | "drafts" | "published" | "simulateur" | "tracking-score"
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
  onPick: (v: "veille" | "leads" | "content" | "drafts" | "published" | "simulateur" | "tracking-score") => void;
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

  useEffect(() => {
    callFunction("admin-leads", session)
      .then((data) => setLeads(data.leads))
      .catch((e) => setError(String(e)));
  }, [session]);

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

  return (
    <main className="panel">
      <p className="eyebrow">Leads</p>
      <h1>{leads ? `${leads.length} lead${leads.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}
      <div className="options" role="list">
        {leads?.map((l) => (
          <button key={l.id} type="button" className="option" onClick={() => setSelected(l)}>
            <strong>{l.name}</strong> — {l.status || "nouveau"}
          </button>
        ))}
        {leads && leads.length === 0 && <p>Aucun lead pour l’instant.</p>}
      </div>
      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
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

  const sortedItems = items ? [...items].sort((a, b) => relevanceRank(a) - relevanceRank(b)) : null;

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

      <p className="eyebrow" style={{ marginTop: "1.5rem" }}>
        {items ? `${items.length} article${items.length > 1 ? "s" : ""} à trier` : "Chargement…"}
      </p>
      <div className="options" role="list">
        {sortedItems?.map((item) => (
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
      </div>

      <div className="actions" style={{ marginTop: "1.25rem" }}>
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
      <div className="options" role="list">
        {drafts?.map((d) => (
          <button
            key={d.number}
            type="button"
            className="option"
            onClick={() => open(d)}
            disabled={loadingId === d.number}
          >
            <strong>{d.title}</strong> — {new Date(d.createdAt).toLocaleDateString("fr-FR")}
            {loadingId === d.number ? " · chargement…" : ""}
          </button>
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

  return (
    <main className="panel">
      <p className="eyebrow">Articles publiés</p>
      <h1>{items ? `${items.length} article${items.length > 1 ? "s" : ""}` : "Chargement…"}</h1>
      {error && <p className="error">{error}</p>}
      <div className="options" role="list">
        {items?.map((i) => (
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
      </div>
      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
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
