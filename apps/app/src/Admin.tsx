import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { marked } from "marked";
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
          <code> /mag</code> d’ici 1 à 2 minutes.
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

// --- Preview iso article (reproduit le style de /mag/[slug], site statique
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
      img.setAttribute("src", `https://raw.githubusercontent.com/atrari-pro/studio-jannah/${headRef}${src}`);
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
        Le Mag <span className={`status-pill status-${status}`}>{status}</span>
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
