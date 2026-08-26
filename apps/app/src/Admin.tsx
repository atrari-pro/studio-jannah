import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./lib/supabase";

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

export function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<"menu" | "leads" | "content" | "drafts">("menu");

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

  if (session === undefined) {
    return (
      <main className="panel">
        <p className="eyebrow">Admin</p>
        <h1>Chargement…</h1>
      </main>
    );
  }

  if (!session) return <Login />;

  const logout = () => getSupabase()?.auth.signOut();

  if (view === "menu") return <Menu onPick={setView} onLogout={logout} />;
  if (view === "leads") return <Leads session={session} onBack={() => setView("menu")} />;
  if (view === "drafts") return <Drafts session={session} onBack={() => setView("menu")} />;
  return <Content session={session} onBack={() => setView("menu")} />;
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

function Menu({
  onPick,
  onLogout,
}: {
  onPick: (v: "leads" | "content" | "drafts") => void;
  onLogout: () => void;
}) {
  return (
    <main className="panel">
      <p className="eyebrow">Admin · Studio Jannah</p>
      <h1>Que veux-tu faire ?</h1>
      <div className="options" role="list">
        <button type="button" className="option" onClick={() => onPick("leads")}>
          Gérer les leads
        </button>
        <button type="button" className="option" onClick={() => onPick("content")}>
          Publier un contenu
        </button>
        <button type="button" className="option" onClick={() => onPick("drafts")}>
          Voir les drafts en attente
        </button>
      </div>
      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onLogout}>
          Se déconnecter
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

function Content({ session, onBack }: { session: Session; onBack: () => void }) {
  const [step, setStep] = useState<ContentStep>("type");
  const [history, setHistory] = useState<ContentStep[]>([]);
  const [form, setForm] = useState<ContentForm>(EMPTY_FORM);
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
            { value: "insight", label: "Insight (Le Mag)" },
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
          <p className="hint">Une par ligne : Label | URL. L’agent n’en invente jamais d’autres.</p>
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

type DraftFile = { path: string; content: string; prUrl: string };

function Drafts({ session, onBack }: { session: Session; onBack: () => void }) {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [selected, setSelected] = useState<DraftFile | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await callFunction("admin-generate-content", session, {
        method: "POST",
        body: JSON.stringify({ action: "read-draft", prNumber: d.number }),
      });
      setSelected(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingId(null);
    }
  }

  if (selected) {
    return (
      <main className="panel">
        <p className="eyebrow">Draft</p>
        <h1>{selected.path}</h1>
        <pre className="field textarea draft-body">{selected.content}</pre>
        <p className="foot" style={{ textAlign: "left", margin: "0 0 1.25rem" }}>
          <a href={selected.prUrl}>{selected.prUrl}</a>
        </p>
        <div className="actions">
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
