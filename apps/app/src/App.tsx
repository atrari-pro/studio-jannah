import { useEffect, useState } from "react";
import { site } from "@studio-jannah/shared/site";
import { SjEvent, track } from "@studio-jannah/shared/datalayer";

const STEPS = [
  {
    id: "contexte",
    title: "Contexte",
    prompt: "Quel est l’enjeu principal ?",
    options: ["Fiabiliser GA4 / tracking", "CRO & conversion", "Data stack / activation", "IA marketing"],
  },
  {
    id: "perimetre",
    title: "Périmètre",
    prompt: "Quel type d’accompagnement ?",
    options: ["Audit one-shot", "Mise en conformité mesure", "Fil rouge / coaching", "Réponse AO / brief"],
  },
  {
    id: "suite",
    title: "Suite",
    prompt: "Prochaine étape souhaitée ?",
    options: ["Échange 30 min", "Recevoir une trame AO", "Voir la vitrine", "Installer la démo (bientôt)"],
  },
] as const;

export function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const step = STEPS[stepIndex];
  const done = stepIndex >= STEPS.length;

  useEffect(() => {
    if (done) {
      track({
        event: SjEvent.FUNNEL_STEP,
        funnel_id: "signal_wizard",
        funnel_step: "done",
        funnel_step_index: STEPS.length,
        funnel_status: "complete",
        page_path: "/app-demo/done",
        page_title: "Démo — terminé",
        page_type: "app_demo",
        content_group: "product",
        surface: "app",
      });
      track({
        event: SjEvent.VIRTUAL_PAGE_VIEW,
        page_path: "/app-demo/done",
        page_title: "Démo — terminé",
        virtual_path: "/app-demo/done",
        funnel_id: "signal_wizard",
        page_type: "app_demo",
        content_group: "product",
        surface: "app",
      });
      return;
    }
    track({
      event: SjEvent.FUNNEL_STEP,
      funnel_id: "signal_wizard",
      funnel_step: step.id,
      funnel_step_index: stepIndex,
      funnel_status: "in_progress",
      page_path: `/app-demo/${step.id}`,
      page_title: `Démo — ${step.title}`,
      page_type: "app_demo",
      content_group: "product",
      surface: "app",
    });
    track({
      event: SjEvent.VIRTUAL_PAGE_VIEW,
      page_path: `/app-demo/${step.id}`,
      page_title: `Démo — ${step.title}`,
      virtual_path: `/app-demo/${step.id}`,
      funnel_id: "signal_wizard",
      funnel_step: step.id,
      page_type: "app_demo",
      content_group: "product",
      surface: "app",
    });
  }, [stepIndex, done, step]);

  function choose(option: string) {
    track({
      event: SjEvent.CTA_CLICK,
      cta_id: `app_wizard_option_${step.id}`,
      cta_label: option.slice(0, 120),
      cta_zone: "app",
      funnel_id: "signal_wizard",
      funnel_step: step.id,
      page_type: "app_demo",
      content_group: "product",
      surface: "app",
    });
    setAnswers([...answers, option]);
    setStepIndex((i) => i + 1);
  }

  function reset() {
    track({
      event: SjEvent.CTA_CLICK,
      cta_id: "app_wizard_cta_reset",
      cta_label: "Rejouer",
      cta_zone: "app",
      funnel_id: "signal_wizard",
      page_type: "app_demo",
      content_group: "product",
      surface: "app",
    });
    setAnswers([]);
    setStepIndex(0);
  }

  return (
    <div className="shell">
      <header className="top">
        <span className="mark" aria-hidden />
        <div>
          <strong>{site.name}</strong>
          <p>Wizard signal · démo mobile-ready</p>
        </div>
      </header>

      <main className="panel">
        {done ? (
          <>
            <p className="eyebrow">Parcours terminé</p>
            <h1>Signal cadré</h1>
            <ul className="summary">
              {answers.map((a, i) => (
                <li key={a}>
                  <span>{STEPS[i]?.title}</span>
                  {a}
                </li>
              ))}
            </ul>
            <div className="actions">
              <a className="btn primary" href="http://localhost:4321/contact">
                Continuer vers contact
              </a>
              <button type="button" className="btn ghost" onClick={reset}>
                Rejouer
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">
              Étape {stepIndex + 1} / {STEPS.length}
            </p>
            <h1>{step.prompt}</h1>
            <div className="options" role="list">
              {step.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="option"
                  onClick={() => choose(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="foot">
        DL v1 · funnel_step + virtual_page_view · surface=app
      </footer>
    </div>
  );
}
