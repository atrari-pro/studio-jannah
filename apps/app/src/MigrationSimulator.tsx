import { useEffect, useRef } from "react";
import "./MigrationSimulator.css";

/**
 * Simulateur de migration tracking client-side → server-side (GCP / Cloud Run).
 *
 * Origine : widget HTML autonome (simulateur-tracking-migration.html), repris
 * ici tel quel côté logique — `compute()` n'a pas été modifié (voir plus bas,
 * copié à l'identique). Seuls le balisage (JSX), le CSS (scopé sous
 * `.msim-root`, tokens Studio Jannah) et l'intégration React ont changé.
 *
 * Approche : le JSX ci-dessous ne fait que poser le squelette statique du
 * widget. Toute l'interactivité (calculs, timeline, synthèse) reste gérée de
 * façon impérative par `mountSimulator()`, exactement comme dans le script
 * d'origine — seules les recherches DOM sont scopées à la racine du composant
 * (`root.querySelector` au lieu de `document.getElementById`) pour ne rien
 * modifier hors de ce composant et permettre un montage/démontage propre.
 * C'est un choix délibéré plutôt qu'une réécriture en state React : le widget
 * manipule une timeline SVG, des champs éditables inline et une synthèse
 * croisée — le convertir en composants contrôlés aurait un vrai risque de
 * régression sur un calcul que la consigne demande de ne pas toucher.
 */

export interface MigrationSimulatorConfig {
  initialPlatform?: "web" | "mobile";
  initialLevel?: "simple" | "standard" | "avance";
}

interface MigrationSimulatorProps {
  onBack: () => void;
  config?: MigrationSimulatorConfig;
}

export function MigrationSimulator({ onBack, config }: MigrationSimulatorProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return mountSimulator(root, config ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="panel">
      <p className="eyebrow">Outils</p>
      <h1>Simulateur de migration tracking</h1>
      <p className="hint">
        Budget indicatif et feuille de route pour un passage du tracking client-side au server-side (Google Cloud
        Run) — à présenter en cadrage client ou à garder en interne pour un chiffrage rapide.
      </p>

      <div ref={rootRef} className="msim-root">
        <div className="msim-head">
          <div className="msim-eyebrow">Estimation &amp; feuille de route</div>
          <h1 id="msim-h1">Passer du tracking client-side au server-side</h1>
          <p>
            Ajustez les paramètres pour obtenir un budget indicatif et une feuille de route de mise en œuvre — de
            l'audit initial jusqu'à la validation finale.
          </p>

          <div className="msim-platform-switch" role="tablist" aria-label="Plateforme">
            <button type="button" className="msim-ps-btn" data-platform="web" role="tab" aria-selected="true">
              <span className="msim-ps-icon" aria-hidden="true">◧</span> Site web
            </button>
            <button type="button" className="msim-ps-btn" data-platform="mobile" role="tab" aria-selected="false">
              <span className="msim-ps-icon" aria-hidden="true">▢</span> Application mobile
            </button>
          </div>
        </div>

        {/* CONTEXTE */}
        <div className="msim-panel">
          <div className="msim-panel-body">
            <div className="msim-eyebrow">Contexte</div>
            <h2 className="msim-section-h" id="ctx-title">
              Server-side GTM sur Google Cloud Run, chiffré pour une posture d'agence
            </h2>
            <p className="msim-body-p" id="ctx-p1">
              Le tracking côté serveur déplace la collecte des évènements (pages vues, ajouts panier, achats) d'un
              script exécuté dans le navigateur vers un conteneur hébergé sur une infrastructure dédiée.
              Concrètement, pour un site de cette taille, cela signifie déployer et exploiter un service{" "}
              <b>Google Cloud Run</b> : c'est l'infrastructure officiellement recommandée par Google pour
              Server-Side Tagging, et celle sur laquelle repose le calcul de cet outil.
            </p>
            <p className="msim-body-p" id="ctx-p2">
              C'est aussi le poste le plus mal estimé dans les devis rapides, parce que son coût dépend de plusieurs
              paramètres qui interagissent entre eux : volume de requêtes, durée de traitement, nombre d'instances
              maintenues actives, taille des réponses, volume de journaux techniques. Le simulateur ci-dessous rend
              ces interactions manipulables, au lieu de figer un seul chiffre — pour un cadrage devant le client
              comme pour un chiffrage interne.
            </p>

            <div className="msim-eyebrow" style={{ marginTop: "26px" }}>
              Ce que Google recommande réellement pour la production
            </div>
            <p className="msim-body-p" id="ctx-p3">
              Le déploiement automatique proposé depuis l'interface Tag Manager crée un service à but de test (une
              seule instance, zéro minimum) — explicitement non prévu pour du trafic live selon la documentation
              officielle.
            </p>
            <div className="msim-callout">
              <b>Point de vigilance :</b> beaucoup de devis circulent encore avec un minimum de 2 instances en
              production. Le guide officiel de bascule en production recommande en réalité{" "}
              <b>un minimum de 3 instances</b> pour supporter le trafic de production de façon fiable — c'est la
              valeur par défaut utilisée dans ce simulateur.
            </div>
            <table>
              <tbody>
                <tr>
                  <th>Élément</th>
                  <th>Recommandation officielle</th>
                </tr>
                <tr>
                  <td>Instances minimum</td>
                  <td>
                    3 instances actives en permanence pour un environnement de production, contre 1 en
                    configuration de test.
                  </td>
                </tr>
                <tr id="ctx-row-domain">
                  <td id="ctx-row-domain-label">Domaine</td>
                  <td id="ctx-row-domain-value">
                    Rattachement à un sous-domaine du site principal (contexte first-party) — condition nécessaire
                    pour limiter le replafonnement des cookies par les navigateurs qui restreignent le suivi
                    (Safari notamment).
                  </td>
                </tr>
                <tr>
                  <td>Région</td>
                  <td>
                    Le déploiement automatique fixe la région par défaut aux États-Unis ; un déploiement manuel
                    permet de choisir une région européenne, pertinent pour la latence et la localisation des
                    données.
                  </td>
                </tr>
                <tr>
                  <td>Supervision</td>
                  <td>
                    Des rapports et journaux natifs exposent requêtes, instances et erreurs — aucun outil tiers
                    requis pour le monitoring de base.
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="msim-callout" id="mobile-store-callout" style={{ display: "none" }}>
              <b>Délai de publication à anticiper :</b> ce n'est pas du temps de travail facturable, mais un délai
              incompressible à intégrer au planning client. Apple annonce que 90 % des soumissions sont examinées
              sous 24 h, mais en pratique les nouvelles soumissions (première publication ou mise à jour majeure)
              prennent souvent 2 à 5 jours en 2026, parfois davantage en période de forte charge. Google Play
              traite généralement les mises à jour en quelques heures, mais une première publication ou une
              catégorie sensible peut prendre jusqu'à plusieurs jours. Une marge est déjà intégrée à l'étape «
              Bascule progressive » de la feuille de route ci-dessous — à ajuster selon l'historique de publication
              de l'app concernée.
            </div>
          </div>
        </div>

        {/* SIMULATEUR */}
        <div className="msim-panel">
          <div className="msim-panel-head">
            <div className="msim-panel-title">Budget indicatif</div>
          </div>
          <div className="msim-grid">
            <div className="msim-inputs">
              <div className="msim-field">
                <div className="msim-field-label">
                  <span id="sessions-label">Sessions mensuelles</span>
                  <span className="msim-field-val" id="v-sessions">200 000</span>
                </div>
                <input
                  type="range"
                  id="sessions"
                  min={20000}
                  max={1000000}
                  step={10000}
                  defaultValue={200000}
                  aria-label="Sessions mensuelles"
                />
              </div>

              <div className="msim-field">
                <div className="msim-field-label">
                  <span id="domains-label">Domaines / sites concernés</span>
                  <span className="msim-field-val" id="v-domains">1</span>
                </div>
                <input
                  type="range"
                  id="domains"
                  min={1}
                  max={6}
                  step={1}
                  defaultValue={1}
                  aria-label="Domaines ou sites concernés"
                />
                <div className="msim-field-hint" id="domains-hint">
                  Chaque domaine est rattaché à son propre environnement dédié, condition pour rester en contexte
                  first-party.
                </div>
              </div>

              <div className="msim-field" id="mobile-scope-field" style={{ display: "none" }}>
                <div className="msim-field-label">
                  <span>Périmètre technique natif</span>
                </div>
                <div className="msim-scope-row">
                  <label className="msim-scope-chk">
                    <input type="checkbox" id="scope-ios" defaultChecked /> iOS · Xcode / Swift
                  </label>
                  <label className="msim-scope-chk">
                    <input type="checkbox" id="scope-android" defaultChecked /> Android · Android Studio / Kotlin
                  </label>
                </div>
                <div className="msim-field-hint">
                  Chaque plateforme cochée ajoute son propre lot d'intégration SDK, de build et de tests — ce n'est
                  pas une simple case de configuration, c'est un développement natif distinct par OS.
                </div>
              </div>

              <div className="msim-field">
                <div className="msim-field-label">
                  <span>Niveau de complexité</span>
                </div>
                <div className="msim-cards" id="level-cards" role="group" aria-label="Niveau de complexité">
                  <button type="button" className="msim-lvl-card" data-level="simple" aria-pressed="false">
                    <div className="t">Simple</div>
                    <div className="d">Un seul flux d'évènements</div>
                  </button>
                  <button type="button" className="msim-lvl-card" data-level="standard" aria-pressed="true">
                    <div className="t">Standard</div>
                    <div className="d">Plusieurs flux connectés</div>
                  </button>
                  <button type="button" className="msim-lvl-card" data-level="avance" aria-pressed="false">
                    <div className="t">Avancé</div>
                    <div className="d">Configuration étendue</div>
                  </button>
                </div>
              </div>

              <div className="msim-field">
                <div className="msim-field-label">
                  <span>Taux jour appliqué</span>
                  <span className="msim-field-val" id="v-tjm">650 €/j</span>
                </div>
                <input type="range" id="tjm" min={350} max={950} step={10} defaultValue={650} aria-label="Taux jour appliqué" />
              </div>

              <button type="button" className="msim-toggle-row" id="margin-toggle-row" role="switch" aria-checked="false">
                <div className="msim-switch" id="margin-switch"></div>
                <span>Appliquer une marge de revente au temps facturé</span>
              </button>
              <div className="msim-field" id="margin-field" style={{ display: "none" }}>
                <div className="msim-field-label">
                  <span>Marge</span>
                  <span className="msim-field-val" id="v-margin">20 %</span>
                </div>
                <input type="range" id="margin" min={0} max={60} step={5} defaultValue={20} aria-label="Marge de revente" />
              </div>

              <details id="advanced-details">
                <summary>Paramètres avancés</summary>
                <div className="msim-adv-body">
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Instances minimum actives</span>
                      <span className="msim-field-val" id="v-mininst">3</span>
                    </div>
                    <input type="range" id="mininst" min={1} max={6} step={1} defaultValue={3} aria-label="Instances minimum actives" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Capacité par instance (vCPU)</span>
                      <span className="msim-field-val" id="v-vcpu">1</span>
                    </div>
                    <input type="range" id="vcpu" min={0.5} max={2} step={0.5} defaultValue={1} aria-label="Capacité par instance en vCPU" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Mémoire par instance (Gio)</span>
                      <span className="msim-field-val" id="v-mem">1</span>
                    </div>
                    <input type="range" id="mem" min={0.25} max={2} step={0.25} defaultValue={1} aria-label="Mémoire par instance en Gio" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span id="reqps-label">Requêtes par session</span>
                      <span className="msim-field-val" id="v-reqps">9</span>
                    </div>
                    <input type="range" id="reqps" min={4} max={15} step={1} defaultValue={9} aria-label="Requêtes par session" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Temps de traitement moyen (ms)</span>
                      <span className="msim-field-val" id="v-dur">150</span>
                    </div>
                    <input type="range" id="dur" min={50} max={400} step={10} defaultValue={150} aria-label="Temps de traitement moyen en millisecondes" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Concurrence par instance</span>
                      <span className="msim-field-val" id="v-conc">10</span>
                    </div>
                    <input type="range" id="conc" min={1} max={80} step={1} defaultValue={10} aria-label="Concurrence par instance" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Marge pour pics de trafic</span>
                      <span className="msim-field-val" id="v-load">×1.5</span>
                    </div>
                    <input type="range" id="load" min={1} max={3} step={0.1} defaultValue={1.5} aria-label="Marge pour pics de trafic" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Poids moyen d'une réponse (Ko)</span>
                      <span className="msim-field-val" id="v-resp">3</span>
                    </div>
                    <input type="range" id="resp" min={1} max={15} step={0.5} defaultValue={3} aria-label="Poids moyen d'une réponse en Ko" />
                  </div>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Volume de journaux par requête (Ko)</span>
                      <span className="msim-field-val" id="v-log">1.5</span>
                    </div>
                    <input type="range" id="log" min={0.3} max={6} step={0.1} defaultValue={1.5} aria-label="Volume de journaux par requête en Ko" />
                  </div>
                  <div className="msim-field">
                    <label className="msim-field-label" htmlFor="ret">
                      <span>Conservation des journaux</span>
                    </label>
                    <select id="ret" defaultValue="0">
                      <option value="0">Standard — 30 jours</option>
                      <option value="30">60 jours</option>
                      <option value="60">90 jours</option>
                      <option value="335">365 jours</option>
                    </select>
                  </div>
                  <button type="button" className="msim-toggle-row" id="lb-toggle-row" role="switch" aria-checked="false">
                    <div className="msim-switch" id="lb-switch"></div>
                    <span>Répartiteur de charge dédié</span>
                  </button>
                  <div className="msim-field">
                    <div className="msim-field-label">
                      <span>Maintenance mensuelle</span>
                      <span className="msim-field-val" id="v-maint">6 h/mois</span>
                    </div>
                    <input type="range" id="maint" min={1} max={24} step={1} defaultValue={6} aria-label="Maintenance mensuelle en heures" />
                  </div>
                </div>
              </details>
            </div>

            <div className="msim-outputs">
              <div className="msim-out-headline">
                <div className="label">Infrastructure — coût mensuel estimé</div>
                <div className="value" id="out-infra-monthly">≈ — €</div>
                <div className="sub">hébergement uniquement, hors temps d'équipe</div>
              </div>

              <div className="msim-bar-track" id="bar-track"></div>
              <div className="msim-breakdown-row">
                <span className="bl">
                  <span className="msim-dot" style={{ background: "var(--msim-highlight)" }}></span>Serveur
                </span>
                <span className="bv" id="b-compute">—</span>
              </div>
              <div className="msim-breakdown-row">
                <span className="bl">
                  <span className="msim-dot" style={{ background: "var(--msim-accent)" }}></span>Requêtes
                </span>
                <span className="bv" id="b-requests">—</span>
              </div>
              <div className="msim-breakdown-row">
                <span className="bl">
                  <span className="msim-dot" style={{ background: "var(--msim-text-dim)" }}></span>Réseau
                </span>
                <span className="bv" id="b-egress">—</span>
              </div>
              <div className="msim-breakdown-row">
                <span className="bl">
                  <span className="msim-dot" style={{ background: "var(--msim-text-muted)" }}></span>Journaux
                </span>
                <span className="bv" id="b-logging">—</span>
              </div>
              <div className="msim-breakdown-row">
                <span className="bl">
                  <span className="msim-dot" style={{ background: "var(--msim-border-strong)" }}></span>Répartiteur
                </span>
                <span className="bv" id="b-lb">—</span>
              </div>

              <div className="msim-sources-check">
                <div className="msim-sc-label">Références de vérification</div>
                <a href="https://cloud.google.com/run/pricing" target="_blank" rel="noreferrer">Tarifs Cloud Run officiels ↗</a>
                <a href="https://cloud.google.com/vpc/pricing-announce" target="_blank" rel="noreferrer">Tarifs réseau officiels ↗</a>
                <a href="https://cloud.google.com/products/observability/pricing" target="_blank" rel="noreferrer">Tarifs journalisation officiels ↗</a>
                <a href="https://cloud.google.com/load-balancing/pricing" target="_blank" rel="noreferrer">Tarifs répartiteur officiels ↗</a>
              </div>

              <div className="msim-evol-box">
                <div className="msim-evol-head">
                  <span className="msim-evol-arrow" id="evol-arrow">↓</span>
                  <span id="evol-headline">—</span>
                </div>
                <p className="msim-evol-detail" id="evol-detail">—</p>
              </div>

              <p className="msim-foot-note" id="out-days-note">— jours d'accompagnement inclus en première année.</p>
            </div>
          </div>
        </div>

        {/* GRILLES SOURCE */}
        <details style={{ marginTop: "28px" }}>
          <summary>Grilles Google Cloud, à la source</summary>
          <div className="msim-adv-body">
            <p className="msim-body-p" style={{ marginTop: "6px" }}>
              Prix officiels utilisés par le calcul, région Europe, tarifs par défaut sans engagement.
            </p>

            <h3 className="msim-section-h" style={{ fontSize: "14px", margin: "16px 0 6px" }}>
              Cloud Run — facturation à la requête
            </h3>
            <table>
              <tbody>
                <tr><th>Ressource</th><th>Tarif</th><th>Palier gratuit / mois</th></tr>
                <tr><td>CPU — temps actif</td><td className="msim-num">0,000024 $ / vCPU-seconde</td><td className="msim-num">180 000 vCPU-s</td></tr>
                <tr><td>CPU — temps inactif (instances mini.)</td><td className="msim-num">0,0000025 $ / vCPU-seconde</td><td rowSpan={2} className="msim-num">inclus ci-dessus</td></tr>
                <tr><td>Mémoire — actif / inactif</td><td className="msim-num">0,0000025 $ / Gio-seconde</td></tr>
                <tr><td>Requêtes</td><td className="msim-num">0,40 $ / million</td><td className="msim-num">2 millions de requêtes</td></tr>
              </tbody>
            </table>

            <h3 className="msim-section-h" style={{ fontSize: "14px", margin: "16px 0 6px" }}>
              Réseau — sortie internet
            </h3>
            <table>
              <tbody>
                <tr><th>Volume mensuel</th><th>Tarif</th></tr>
                <tr><td>0 – 1 Tio</td><td className="msim-num">0,12 $ / Gio</td></tr>
                <tr><td>1 – 10 Tio</td><td className="msim-num">0,11 $ / Gio</td></tr>
                <tr><td>Au-delà de 10 Tio</td><td className="msim-num">0,085 $ / Gio</td></tr>
              </tbody>
            </table>

            <h3 className="msim-section-h" style={{ fontSize: "14px", margin: "16px 0 6px" }}>Journalisation</h3>
            <table>
              <tbody>
                <tr><th>Poste</th><th>Tarif</th><th>Palier gratuit</th></tr>
                <tr><td>Ingestion</td><td className="msim-num">0,50 $ / Gio</td><td className="msim-num">50 Gio / mois</td></tr>
                <tr><td>Conservation au-delà de 30 j</td><td className="msim-num">0,01 $ / Gio / mois</td><td className="msim-num">30 premiers jours inclus</td></tr>
              </tbody>
            </table>

            <h3 className="msim-section-h" style={{ fontSize: "14px", margin: "16px 0 6px" }}>Répartiteur de charge</h3>
            <table>
              <tbody>
                <tr><th>Poste</th><th>Tarif</th></tr>
                <tr><td>Jusqu'à 5 règles de routage</td><td className="msim-num">0,025 $ / heure</td></tr>
                <tr><td>Règle additionnelle</td><td className="msim-num">0,01 $ / heure</td></tr>
                <tr><td>Traitement de données</td><td className="msim-num">≈ 0,008 – 0,012 $ / Gio</td></tr>
              </tbody>
            </table>
            <p className="msim-foot-note">
              Sources : documentation officielle Google Cloud (Cloud Run, réseau, journalisation, répartition de
              charge) et documentation officielle Server-Side Tagging, consultées août 2026.
            </p>
          </div>
        </details>

        {/* METHODE */}
        <div className="msim-panel" style={{ marginTop: "16px" }}>
          <div className="msim-panel-body">
            <div className="msim-eyebrow">Méthode</div>
            <h2 className="msim-section-h" style={{ fontSize: "17px" }}>
              Ce que le simulateur simplifie volontairement
            </h2>
            <ul className="msim-plain">
              <li>
                <b>Le temps d'instance facturé n'est pas un simple produit requêtes × durée.</b> L'infrastructure
                facture le temps réel d'activité, mutualisé entre les requêtes traitées en parallèle. Le calcul
                applique donc <i>(requêtes × durée) ÷ concurrence</i>, puis une marge pour les pics de trafic
                (paramètre avancé) — un trafic réel, avec ses pics, coûte toujours plus cher qu'un calcul en charge
                parfaitement lissée.
              </li>
              <li><b>La conversion de devise est approximative</b> et fluctue ; à réactualiser avant tout chiffrage contractuel.</li>
              <li>
                <b>Le calcul ne couvre pas les services annexes</b> (build automatisé, registre d'images, connecteur
                réseau privé) — généralement mineurs à ce volume, mais non nuls.
              </li>
              <li><b>L'export de données vers un entrepôt analytique</b> (type BigQuery) est hors périmètre — à chiffrer séparément si prévu.</li>
              <li>
                <b>Le multi-domaines est traité comme des déploiements isolés</b>, une infrastructure par domaine.
                Une architecture mutualisée réduirait le coût proportionnellement, au prix d'un couplage plus fort
                entre sites.
              </li>
              <li>
                <b>Écart possible avec la facture réellement observée :</b> ce calcul donne un plancher technique
                construit à partir des tarifs unitaires officiels. Les factures réelles sont parfois plus élevées
                (concurrence effective plus basse entre requêtes, appels de relance vers des services tiers) — à
                traiter comme une base de discussion, affinée avec un mois de mesure réelle avant devis ferme.
              </li>
              <li>
                <b>Avant tout engagement contractuel</b>, valider les montants avec l'outil de calcul officiel du
                fournisseur cloud et, idéalement, un mois de mesure réelle en environnement de préproduction.
              </li>
            </ul>
          </div>
        </div>

        {/* TIMELINE */}
        <div className="msim-panel" style={{ marginTop: "16px" }}>
          <div className="msim-panel-head">
            <div className="msim-panel-title">Ligne du temps du projet</div>
            <span className="msim-rm-total-inline" id="rm-total-days">— jours au total</span>
          </div>
          <div className="msim-panel-body">
            <p className="msim-body-p" style={{ marginBottom: "18px" }}>
              Chaque étape est modifiable : titre, description et durée. La date se recalcule automatiquement pour
              toutes les étapes suivantes.
            </p>
            <div className="msim-tl-controls">
              <div className="msim-tl-date">
                <label htmlFor="tl-start">Démarrage souhaité</label>
                <input type="date" id="tl-start" />
              </div>
              <div className="msim-tl-gran" role="group" aria-label="Granularité de la timeline">
                <button type="button" data-g="day" aria-pressed="true">Jour</button>
                <button type="button" data-g="week" aria-pressed="false">Semaine</button>
              </div>
              <div className="msim-tl-zoom" role="group" aria-label="Zoom de la timeline">
                <button type="button" id="tl-zoom-out" aria-label="Réduire le zoom">−</button>
                <button type="button" id="tl-zoom-reset">
                  <span id="tl-zoom-label">Ajuster</span>
                </button>
                <button type="button" id="tl-zoom-in" aria-label="Augmenter le zoom">+</button>
              </div>
            </div>
            <div className="msim-timeline-viewport" id="timeline-viewport">
              <div id="timeline-viz"></div>
            </div>
            <button type="button" className="msim-btn" id="add-event-btn" style={{ marginTop: "8px" }}>
              + Ajouter une étape
            </button>
          </div>
        </div>

        {/* SYNTHESE */}
        <div className="msim-panel" style={{ marginTop: "16px" }}>
          <div className="msim-panel-head">
            <div className="msim-panel-title">Synthèse</div>
          </div>
          <div className="msim-panel-body">
            <p className="msim-body-p" style={{ marginBottom: "16px" }}>
              Récapitulatif des paramètres choisis, avec les leviers encore ajustables juste avant intégration.
            </p>

            <div className="msim-recap-grid" id="recap-params"></div>

            <div className="msim-recap-edit-row">
              <div className="msim-field">
                <label className="msim-field-label" htmlFor="recap-days-input">
                  <span>Jours d'accompagnement (total)</span>
                  <span className="msim-field-val" id="v-recap-days">— j</span>
                </label>
                <input type="number" id="recap-days-input" min={0} step={0.5} />
                <div className="msim-field-hint">
                  Modifie proportionnellement la durée de chaque étape de la feuille de route ci-dessus.
                </div>
              </div>
              <div className="msim-field">
                <div className="msim-field-label">
                  <span>Taux jour appliqué</span>
                  <span className="msim-field-val" id="v-recap-tjm">— €/j</span>
                </div>
                <input type="range" id="recap-tjm" min={350} max={950} step={10} aria-label="Taux jour appliqué (synthèse)" />
              </div>
            </div>

            <div className="msim-recap-total">
              <div className="msim-rt-label">Investissement estimé — première année</div>
              <div className="msim-rt-value" id="recap-total-value">— €</div>
              <div className="msim-rt-sub" id="recap-total-sub">—</div>
            </div>

            <details>
              <summary>Détail pour intégration</summary>
              <div className="msim-adv-body">
                <table id="recap-detail-table"><tbody /></table>
              </div>
            </details>
          </div>
        </div>

        <div className="msim-actions">
          <button type="button" className="msim-btn primary" id="export-btn">Télécharger en .doc</button>
          <button type="button" className="msim-btn" id="reset-btn">Réinitialiser</button>
        </div>
      </div>

      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Logique du widget — portée depuis simulateur-tracking-migration.html.
// `compute()` est copiée à l'identique (aucun calcul modifié). Le reste est
// adapté uniquement pour scoper les accès DOM à la racine du composant.
// ---------------------------------------------------------------------------

interface Phase {
  t: string;
  d: string;
  days: number;
}

interface SimState {
  platform: "web" | "mobile";
  sessions: number;
  domains: number;
  level: "simple" | "standard" | "avance";
  tjm: number;
  marginOn: boolean;
  margin: number;
  mininst: number;
  vcpu: number;
  mem: number;
  reqps: number;
  dur: number;
  conc: number;
  load: number;
  resp: number;
  log: number;
  ret: number;
  lb: boolean;
  maint: number;
  startDate: Date;
  granularity: "day" | "week";
  /** 1 = tient exactement dans la largeur visible, sans scroll. */
  timelineZoom: number;
  scopeIOS: boolean;
  scopeAndroid: boolean;
  phases: Phase[];
}

function mountSimulator(root: HTMLElement, config: MigrationSimulatorConfig): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string): T | null => root.querySelector<T>("#" + id);
  const $all = <T extends HTMLElement = HTMLElement>(selector: string): T[] =>
    Array.from(root.querySelectorAll<T>(selector));

  interface LevelPreset {
    mininst: number;
    vcpu: number;
    mem: number;
    reqps: number;
    dur: number;
    conc: number;
    load: number;
    days: number[];
    sdkDaysPerOS: number;
  }
  const PRESETS: Record<SimState["level"], LevelPreset> = {
    simple: { mininst: 2, vcpu: 0.5, mem: 0.5, reqps: 6, dur: 100, conc: 15, load: 1.3, days: [1, 1, 2, 1, 0.5, 0.5], sdkDaysPerOS: 1.5 },
    standard: { mininst: 3, vcpu: 1, mem: 1, reqps: 9, dur: 150, conc: 10, load: 1.5, days: [2, 2, 6, 3, 2, 1], sdkDaysPerOS: 3 },
    avance: { mininst: 4, vcpu: 1, mem: 1.5, reqps: 12, dur: 200, conc: 8, load: 1.8, days: [3, 4, 10, 5, 3, 2], sdkDaysPerOS: 5 },
  };

  interface PhaseDef {
    t: string;
    d: string;
  }
  const PHASES_BY_PLATFORM: Record<SimState["platform"], PhaseDef[]> = {
    web: [
      { t: "Cadrage & audit", d: "Cartographie des évènements existants, périmètre, accès à réunir." },
      { t: "Infrastructure & domaine", d: "Provisionnement de l'environnement, rattachement du domaine dédié, autorisations d'accès." },
      { t: "Implémentation", d: "Connexion des flux de données, configuration des évènements et des règles de traitement." },
      { t: "Tests & recette", d: "Environnement de pré-production, comparaison des volumes avant/après en parallèle." },
      { t: "Bascule progressive", d: "Fonctionnement en double run, surveillance, ajustements." },
      { t: "Validation & passation", d: "Documentation, formation de l'équipe, clôture du projet." },
    ],
    mobile: [
      { t: "Cadrage & audit", d: "Cartographie des évènements existants dans le SDK, périmètre iOS/Android, accès aux consoles développeur à réunir." },
      { t: "Infrastructure & connexion SDK", d: "Provisionnement de l'environnement, génération des clés d'API, connexion du SDK applicatif au point de terminaison." },
      { t: "Implémentation", d: "Connexion des flux d'évènements applicatifs, configuration des règles de traitement." },
      { t: "Tests & recette", d: "Environnement de pré-production, comparaison des volumes avant/après sur builds de test." },
      { t: "Bascule progressive", d: "Fonctionnement en double run, surveillance, ajustements avant déploiement en production." },
      { t: "Validation & passation", d: "Documentation, formation de l'équipe, clôture du projet." },
    ],
  };

  const PLATFORM_TEXT = {
    web: {
      ctxTitle: "Server-side GTM sur Google Cloud Run, chiffré pour une posture d'agence",
      ctxP1: "Le tracking côté serveur déplace la collecte des évènements (pages vues, ajouts panier, achats) d'un script exécuté dans le navigateur vers un conteneur hébergé sur une infrastructure dédiée. Concrètement, pour un site de cette taille, cela signifie déployer et exploiter un service <b>Google Cloud Run</b> : c'est l'infrastructure officiellement recommandée par Google pour Server-Side Tagging, et celle sur laquelle repose le calcul de cet outil.",
      ctxP2: "C'est aussi le poste le plus mal estimé dans les devis rapides, parce que son coût dépend de plusieurs paramètres qui interagissent entre eux : volume de requêtes, durée de traitement, nombre d'instances maintenues actives, taille des réponses, volume de journaux techniques. Le simulateur ci-dessous rend ces interactions manipulables, au lieu de figer un seul chiffre — pour un cadrage devant le client comme pour un chiffrage interne.",
      ctxP3: "Le déploiement automatique proposé depuis l'interface Tag Manager crée un service à but de test (une seule instance, zéro minimum) — explicitement non prévu pour du trafic live selon la documentation officielle.",
      domainLabel: "Domaine",
      domainValue: "Rattachement à un sous-domaine du site principal (contexte first-party) — condition nécessaire pour limiter le replafonnement des cookies par les navigateurs qui restreignent le suivi (Safari notamment).",
      sessionsLabel: "Sessions mensuelles",
      domainsFieldLabel: "Domaines / sites concernés",
      domainsHint: "Chaque domaine est rattaché à son propre environnement dédié, condition pour rester en contexte first-party.",
      reqpsLabel: "Requêtes par session",
    },
    mobile: {
      ctxTitle: "Tracking applicatif server-side sur Google Cloud Run, chiffré pour une posture d'agence",
      ctxP1: "Le même principe s'applique aux applications mobiles : au lieu d'envoyer les évènements directement depuis le SDK (Firebase ou équivalent) vers les plateformes tierces, l'application les transmet à un relais hébergé, qui les retransmet ensuite de façon fiable et contrôlée. L'infrastructure sous-jacente — un service <b>Google Cloud Run</b> — est la même que pour un site web ; ce qui change, c'est la source des évènements et l'absence des contraintes liées aux cookies navigateur.",
      ctxP2: "C'est aussi le poste le plus mal estimé dans les devis rapides, parce que son coût dépend de plusieurs paramètres qui interagissent entre eux : volume de requêtes, durée de traitement, nombre d'instances maintenues actives, taille des réponses, volume de journaux techniques. Le simulateur ci-dessous rend ces interactions manipulables, au lieu de figer un seul chiffre — pour un cadrage devant le client comme pour un chiffrage interne.",
      ctxP3: "Le déploiement automatique proposé depuis l'interface Tag Manager crée un service à but de test (une seule instance, zéro minimum) — explicitement non prévu pour du trafic live selon la documentation officielle, que les évènements proviennent d'un site ou d'une application.",
      domainLabel: "Point d'entrée",
      domainValue: "Une application mobile n'est pas soumise aux restrictions de cookies navigateur : l'enjeu porte plutôt sur la stabilité et la sécurité du point de terminaison (certificat, clé d'API) auquel le SDK envoie ses évènements.",
      sessionsLabel: "Sessions applicatives mensuelles",
      domainsFieldLabel: "Applications concernées (iOS / Android)",
      domainsHint: "Chaque application dispose de sa propre configuration SDK connectée à l'infrastructure commune.",
      reqpsLabel: "Évènements par session applicative",
    },
  } as const;

  const state: SimState = {
    platform: "web",
    sessions: 200000,
    domains: 1,
    level: "standard",
    tjm: 650,
    marginOn: false,
    margin: 20,
    mininst: 3,
    vcpu: 1,
    mem: 1,
    reqps: 9,
    dur: 150,
    conc: 10,
    load: 1.5,
    resp: 3,
    log: 1.5,
    ret: 0,
    lb: false,
    maint: 6,
    startDate: new Date(),
    granularity: "day",
    timelineZoom: 1,
    scopeIOS: true,
    scopeAndroid: true,
    phases: [],
  };

  const EUR_USD = 0.92;
  const SEC_MONTH = 30 * 24 * 3600;
  const FREE_VCPU_SEC = 180000,
    FREE_GIB_SEC = 360000,
    FREE_REQ = 2000000,
    FREE_LOG_GIB = 50;

  function fmtEUR(n: number) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " €";
  }
  function fmtNum(n: number) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
  }

  function egressCostUSD(gb: number) {
    let cost = 0,
      remaining = gb;
    const t1 = Math.min(remaining, 1024);
    cost += t1 * 0.12;
    remaining -= t1;
    if (remaining > 0) {
      const t2 = Math.min(remaining, 9 * 1024);
      cost += t2 * 0.11;
      remaining -= t2;
    }
    if (remaining > 0) {
      cost += remaining * 0.085;
    }
    return cost;
  }

  function totalDays() {
    return state.phases.reduce((a, p) => a + p.days, 0);
  }

  function setTotalDays(newTotal: number) {
    const current = totalDays();
    if (current <= 0 || !isFinite(newTotal) || newTotal < 0) return;
    const factor = newTotal / current;
    state.phases.forEach((p) => {
      p.days = Math.max(0, +(p.days * factor).toFixed(1));
    });
  }

  // --- compute() : copié à l'identique depuis simulateur-tracking-migration.html — AUCUN calcul modifié. ---
  function compute() {
    const s = state;
    const totalReqPerDomain = s.sessions * s.reqps;

    const idleVcpuSec = s.mininst * s.vcpu * SEC_MONTH;
    const idleGibSec = s.mininst * s.mem * SEC_MONTH;
    const billedActiveSec = (totalReqPerDomain * (s.dur / 1000) / s.conc) * s.load;
    const activeVcpuSec = billedActiveSec * s.vcpu;
    const activeGibSec = billedActiveSec * s.mem;

    const idleVcpuBillable = Math.max(0, idleVcpuSec - FREE_VCPU_SEC);
    const idleGibBillable = Math.max(0, idleGibSec - FREE_GIB_SEC);
    const idleCpuCost = idleVcpuBillable * 0.0000025;
    const idleMemCost = idleGibBillable * 0.0000025;
    const activeCpuCost = activeVcpuSec * 0.000024;
    const activeMemCost = activeGibSec * 0.0000025;

    const reqBillable = Math.max(0, totalReqPerDomain - FREE_REQ);
    const requestsCostPerDomain = (reqBillable / 1000000) * 0.4;

    const computeCostUSD = (idleCpuCost + idleMemCost + activeCpuCost + activeMemCost) * s.domains;
    const requestsCostUSD = requestsCostPerDomain * s.domains;

    const totalReqAll = totalReqPerDomain * s.domains;
    const egressGB = (totalReqAll * s.resp) / (1024 * 1024);
    const egressCostVal = egressCostUSD(egressGB);

    const totalLogGB = (totalReqAll * s.log) / (1024 * 1024);
    const logBillableGB = Math.max(0, totalLogGB - FREE_LOG_GIB);
    const loggingCostUSD = logBillableGB * 0.5 + totalLogGB * (s.ret / 30) * 0.01;

    const lbNeeded = s.lb || s.domains > 1;
    const lbCostUSD = lbNeeded ? 0.025 * 24 * 30.44 + egressGB * 0.01 : 0;

    const infraMonthlyUSD = (computeCostUSD + requestsCostUSD + egressCostVal + loggingCostUSD + lbCostUSD) * 1.15;
    const infraMonthlyEUR = infraMonthlyUSD * EUR_USD;
    const infraAnnualEUR = infraMonthlyEUR * 12;

    const hourlyRate = s.tjm / 8;
    const marginMult = s.marginOn ? 1 + s.margin / 100 : 1;
    const days = totalDays();
    const implementationEUR = days * 8 * hourlyRate * marginMult;
    const maintenanceAnnualEUR = s.maint * 12 * hourlyRate * marginMult;

    const year1 = implementationEUR + infraAnnualEUR;
    const yearNplus = infraAnnualEUR + maintenanceAnnualEUR;
    const tco5 = year1 + yearNplus * 4;

    return {
      computeCostUSD,
      requestsCostUSD,
      egressCostVal,
      loggingCostUSD,
      lbCostUSD,
      infraMonthlyEUR,
      infraAnnualEUR,
      implementationEUR,
      maintenanceAnnualEUR,
      year1,
      yearNplus,
      tco5,
      lbNeeded,
      days,
    };
  }
  // --- fin compute() ---

  function render() {
    const r = compute();
    const usdToEur = (v: number) => v * EUR_USD * 1.15;

    setText("out-infra-monthly", "≈ " + fmtEUR(r.infraMonthlyEUR) + "/mois");

    const parts = [
      { v: r.computeCostUSD, c: "var(--msim-highlight)" },
      { v: r.requestsCostUSD, c: "var(--msim-accent)" },
      { v: r.egressCostVal, c: "var(--msim-text-dim)" },
      { v: r.loggingCostUSD, c: "var(--msim-text-muted)" },
      { v: r.lbCostUSD, c: "var(--msim-border-strong)" },
    ];
    const total = parts.reduce((a, p) => a + p.v, 0) || 1;
    const barTrack = $("bar-track");
    if (barTrack) {
      barTrack.innerHTML = parts
        .map((p) => `<div class="msim-bar-seg" style="width:${((p.v / total) * 100).toFixed(2)}%; background:${p.c};"></div>`)
        .join("");
    }

    setText("b-compute", fmtEUR(usdToEur(r.computeCostUSD)) + "/mois");
    setText("b-requests", fmtEUR(usdToEur(r.requestsCostUSD)) + "/mois");
    setText("b-egress", fmtEUR(usdToEur(r.egressCostVal)) + "/mois");
    setText("b-logging", fmtEUR(usdToEur(r.loggingCostUSD)) + "/mois");
    setText("b-lb", r.lbNeeded ? fmtEUR(usdToEur(r.lbCostUSD)) + "/mois" : "non nécessaire");

    const pctChange = r.year1 > 0 ? ((r.yearNplus - r.year1) / r.year1) * 100 : 0;
    const decreasing = pctChange < 0;
    const arrowEl = $("evol-arrow");
    if (arrowEl) {
      arrowEl.textContent = decreasing ? "↓" : "↑";
      arrowEl.style.color = decreasing ? "var(--msim-accent)" : "var(--msim-highlight)";
    }
    setText("evol-headline", (decreasing ? "Coût en baisse de " : "Coût en hausse de ") + Math.abs(pctChange).toFixed(0) + "% après la première année");
    setText(
      "evol-detail",
      "La première année inclut " +
        fmtEUR(r.implementationEUR) +
        " de mise en œuvre (non récurrent), en plus de l'infrastructure. À partir de la deuxième année, seuls l'infrastructure (" +
        fmtEUR(r.infraAnnualEUR) +
        "/an) et la maintenance (" +
        fmtEUR(r.maintenanceAnnualEUR) +
        "/an) restent — d'où la baisse. Détail du calcul en section « Grilles Google Cloud, à la source »."
    );
    setText("out-days-note", r.days + " jours d'accompagnement inclus en première année (" + fmtEUR(r.implementationEUR) + ").");
    setText("rm-total-days", r.days + " jours");

    renderRecap(r);
  }

  function renderRecap(r: ReturnType<typeof compute>) {
    const t = PLATFORM_TEXT[state.platform];
    const items: [string, string | number][] = [
      ["Plateforme", state.platform === "mobile" ? "Application mobile" : "Site web"],
      [t.sessionsLabel, fmtNum(state.sessions)],
      [t.domainsFieldLabel, state.domains],
      ["Niveau de complexité", { simple: "Simple", standard: "Standard", avance: "Avancé" }[state.level]],
    ];
    if (state.platform === "mobile") {
      const osLabels = [state.scopeIOS ? "iOS" : null, state.scopeAndroid ? "Android" : null].filter(Boolean);
      items.push(["Périmètre natif", osLabels.length ? osLabels.join(" + ") : "—"]);
    }
    items.push(["Taux jour", state.tjm + " €/j" + (state.marginOn ? " (+" + state.margin + "%)" : "")]);

    const recapParams = $("recap-params");
    if (recapParams) {
      recapParams.innerHTML = items
        .map(([k, v]) => `<div class="msim-recap-item"><span class="rk">${k}</span><span class="rv">${v}</span></div>`)
        .join("");
    }

    setText("v-recap-days", r.days + " j");
    const recapDaysInput = $<HTMLInputElement>("recap-days-input");
    if (recapDaysInput) recapDaysInput.value = String(r.days);
    setText("v-recap-tjm", state.tjm + " €/j");
    const recapTjm = $<HTMLInputElement>("recap-tjm");
    if (recapTjm) recapTjm.value = String(state.tjm);

    setText("recap-total-value", fmtEUR(r.year1));
    setText("recap-total-sub", "Mise en œuvre (" + fmtEUR(r.implementationEUR) + ") + infrastructure annuelle (" + fmtEUR(r.infraAnnualEUR) + ")");

    const rows = state.phases.map((p) => `<tr><td>${p.t}</td><td>${p.days} j</td></tr>`).join("");
    const detailTable = $("recap-detail-table");
    if (detailTable) {
      detailTable.innerHTML = `
      <tr><th>Poste</th><th>Détail</th></tr>
      ${rows}
      <tr class="total-row"><td>Mise en œuvre totale</td><td>${r.days} j — ${fmtEUR(r.implementationEUR)}</td></tr>
      <tr><td>Infrastructure</td><td>${fmtEUR(r.infraMonthlyEUR)}/mois — ${fmtEUR(r.infraAnnualEUR)}/an</td></tr>
      <tr><td>Maintenance</td><td>${fmtEUR(r.maintenanceAnnualEUR)}/an</td></tr>
      <tr class="total-row"><td>Total première année</td><td>${fmtEUR(r.year1)}</td></tr>
      <tr><td>Total récurrent (année suivante)</td><td>${fmtEUR(r.yearNplus)}/an</td></tr>
    `;
    }
  }

  function setText(id: string, text: string) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + Math.round(days));
    return d;
  }
  function fmtDateShort(d: Date) {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);
  }
  function isoWeek(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  }

  function buildDateLabel(start: Date, end: Date, dur: number) {
    if (state.granularity === "day") {
      return dur <= 1 ? fmtDateShort(start) : fmtDateShort(start) + " → " + fmtDateShort(end);
    }
    return "Semaine " + isoWeek(start) + " · à partir du " + fmtDateShort(start);
  }

  function bindPhaseInputs() {
    $all<HTMLInputElement | HTMLTextAreaElement>(".msim-ts-title-input, .msim-ts-desc-input").forEach((el) => {
      el.addEventListener("input", () => {
        const idx = parseInt(el.dataset.idx || "0", 10);
        const field = el.dataset.field as "t" | "d";
        state.phases[idx][field] = el.value;
      });
    });
    $all<HTMLInputElement>(".msim-ts-dur-input").forEach((el) => {
      el.addEventListener("input", () => {
        const idx = parseInt(el.dataset.idx || "0", 10);
        state.phases[idx].days = parseFloat(el.value) || 0;
        renderTimeline();
        render();
      });
    });
    $all<HTMLButtonElement>(".msim-ts-del").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.idx || "0", 10);
        state.phases.splice(idx, 1);
        renderTimeline();
        render();
      });
    });
  }

  // Un seul IntersectionObserver réutilisé par rendu (plutôt qu'un nouveau à
  // chaque resize comme dans le script d'origine) pour éviter d'accumuler des
  // observateurs jamais déconnectés.
  let revealObserver: IntersectionObserver | null = null;
  function revealNodes(selector: string) {
    const items = $all(selector);
    if (revealObserver) revealObserver.disconnect();
    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("show");
              revealObserver?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      items.forEach((el, i) => {
        el.style.transitionDelay = Math.min(i, 6) * 70 + "ms";
        revealObserver!.observe(el);
      });
    } else {
      items.forEach((el) => el.classList.add("show"));
    }
  }

  // Timeline horizontale : les étapes s'alignent de gauche à droite dans la
  // largeur disponible (calculée pour tenir sans scroll par défaut, zoom=1).
  // Un zoom manuel (state.timelineZoom) permet d'écarter les étapes pour les
  // lire plus confortablement — le scroll horizontal n'apparaît alors que
  // dans ce cas-là, jamais par défaut. Remplace l'ancien tracé vertical
  // serpentin (qui obligeait à scroller toute la page pour suivre les
  // étapes).
  const ROW_H = 420;
  const WAVE_AMPLITUDE = 16;
  const EDGE_MARGIN = 130;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.25;

  function renderTimelineHorizontal(viewport: HTMLElement, container: HTMLElement) {
    const n = state.phases.length;
    const availableWidth = Math.max(viewport.clientWidth, 320);
    const spacingAtFit = n > 1 ? (availableWidth - EDGE_MARGIN * 2) / (n - 1) : 0;
    const spacing = Math.max(90, spacingAtFit * state.timelineZoom);
    const contentWidth = n > 1 ? spacing * (n - 1) + EDGE_MARGIN * 2 : availableWidth;
    const width = Math.max(contentWidth, availableWidth);
    const centerY = ROW_H / 2;

    viewport.style.height = ROW_H + "px";
    container.style.width = width + "px";
    container.style.height = ROW_H + "px";

    let cursor = new Date(state.startDate);
    const points = state.phases.map((p, i) => {
      const start = new Date(cursor);
      const dur = p.days;
      const end = addDays(start, Math.max(dur - 1, 0));
      cursor = addDays(start, dur);
      const x = EDGE_MARGIN + i * spacing;
      const y = centerY + WAVE_AMPLITUDE * Math.sin(i * 1.05);
      return { x, y, start, end, dur, dateLabel: buildDateLabel(start, end, dur) };
    });

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1],
        p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }

    const svg = `<svg class="msim-ts-path-svg" width="${width}" height="${ROW_H}" viewBox="0 0 ${width} ${ROW_H}" aria-hidden="true">
      <defs><linearGradient id="msim-ts-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="var(--sj-garden-bright)"/><stop offset="100%" stop-color="var(--sj-signal)"/>
      </linearGradient></defs>
      <path d="${d}" stroke="url(#msim-ts-grad)" vector-effect="non-scaling-stroke" pathLength="1"/>
    </svg>`;

    // Largeur réelle de la carte, calculée ici (où l'espacement réel entre
    // étapes est connu) et passée en variable CSS — voir le commentaire sur
    // .msim-ts-card dans MigrationSimulator.css pour pourquoi un simple
    // pourcentage CSS ne fonctionne pas (bug du widget d'origine).
    // Deux cartes du même côté (au-dessus / en-dessous) sont espacées de
    // 2×spacing, pas 1× — d'où le facteur ~1.8 plutôt qu'un simple ratio
    // à 1:1 avec l'espacement entre étapes consécutives.
    const cardWidth = Math.round(Math.max(150, Math.min(230, spacing * 1.8)));

    const nodes = points
      .map((pt, i) => {
        const side = i % 2 === 0 ? "above" : "below";
        const p = state.phases[i];
        return `<div class="msim-ts-node side-${side}" data-i="${i}" style="left:${pt.x.toFixed(1)}px; top:${pt.y.toFixed(1)}px; --msim-ts-card-w:${cardWidth}px;">
        <div class="msim-ts-dot">${i + 1}</div>
        <div class="msim-ts-card">
          <div class="msim-ts-date">${pt.dateLabel}</div>
          <input class="msim-ts-title-input" data-idx="${i}" data-field="t" value="${p.t.replace(/"/g, "&quot;")}" aria-label="Titre de l'étape ${i + 1}">
          <textarea class="msim-ts-desc-input" data-idx="${i}" data-field="d" rows="2" aria-label="Description de l'étape ${i + 1}">${p.d}</textarea>
          <div class="msim-ts-footer">
            <div class="msim-ts-dur">
              <input type="number" min="0" step="0.5" value="${p.days}" data-idx="${i}" class="msim-ts-dur-input" aria-label="Durée en jours de l'étape ${i + 1}">
              <span>j</span>
            </div>
            <button class="msim-ts-del" data-idx="${i}" title="Supprimer l'étape" aria-label="Supprimer l'étape ${i + 1}">✕</button>
          </div>
        </div>
      </div>`;
      })
      .join("");

    container.innerHTML = svg + nodes;
    bindPhaseInputs();
    revealNodes(".msim-ts-node");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pathEl = container.querySelector(".msim-ts-path-svg path");
        if (pathEl) pathEl.classList.add("drawn");
      });
    });
  }

  function updateZoomLabel() {
    setText("tl-zoom-label", state.timelineZoom === 1 ? "Ajuster" : Math.round(state.timelineZoom * 100) + "%");
  }

  function renderTimelineStacked(container: HTMLElement) {
    container.style.height = "auto";
    container.style.width = "";
    let cursor = new Date(state.startDate);
    const html = state.phases
      .map((p, i) => {
        const start = new Date(cursor);
        const dur = p.days;
        const end = addDays(start, Math.max(dur - 1, 0));
        cursor = addDays(start, dur);
        const dateLabel = buildDateLabel(start, end, dur);
        return `<div class="msim-tst-item" data-i="${i}">
        <div class="msim-ts-dot">${i + 1}</div>
        <div class="msim-ts-card">
          <div class="msim-ts-date">${dateLabel}</div>
          <input class="msim-ts-title-input" data-idx="${i}" data-field="t" value="${p.t.replace(/"/g, "&quot;")}" aria-label="Titre de l'étape ${i + 1}">
          <textarea class="msim-ts-desc-input" data-idx="${i}" data-field="d" rows="2" aria-label="Description de l'étape ${i + 1}">${p.d}</textarea>
          <div class="msim-ts-footer">
            <div class="msim-ts-dur">
              <input type="number" min="0" step="0.5" value="${p.days}" data-idx="${i}" class="msim-ts-dur-input" aria-label="Durée en jours de l'étape ${i + 1}">
              <span>jour${dur > 1 ? "s" : ""}</span>
            </div>
            <button class="msim-ts-del" data-idx="${i}" title="Supprimer l'étape" aria-label="Supprimer l'étape ${i + 1}">✕</button>
          </div>
        </div>
      </div>`;
      })
      .join("");
    container.innerHTML = html;
    bindPhaseInputs();
    revealNodes(".msim-tst-item");
  }

  function renderTimeline() {
    const viewport = $("timeline-viewport");
    const container = $("timeline-viz");
    if (!viewport || !container) return;
    const wide = viewport.clientWidth >= 640;
    viewport.classList.toggle("is-horizontal", wide);
    container.className = wide ? "msim-timeline-serp" : "msim-timeline-stacked";
    if (wide) {
      renderTimelineHorizontal(viewport, container);
      updateZoomLabel();
    } else {
      viewport.style.height = "";
      renderTimelineStacked(container);
    }
    setText("rm-total-days", totalDays() + " jours au total");
  }

  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderTimeline, 200);
  }
  window.addEventListener("resize", onResize);

  function platformCount() {
    return (state.scopeIOS ? 1 : 0) + (state.scopeAndroid ? 1 : 0) || 1;
  }

  function applyLevel(level: SimState["level"]) {
    state.level = level;
    const p = PRESETS[level];
    state.mininst = p.mininst;
    state.vcpu = p.vcpu;
    state.mem = p.mem;
    state.reqps = p.reqps;
    state.dur = p.dur;
    state.conc = p.conc;
    state.load = p.load;

    const days = p.days.slice();
    const phasesDef = PHASES_BY_PLATFORM[state.platform].map((x) => ({ t: x.t, d: x.d }));

    if (state.platform === "mobile") {
      const nOS = platformCount();
      const sdkExtra = p.sdkDaysPerOS * nOS;
      days[2] = +(days[2] + sdkExtra).toFixed(1);
      days[4] = +(days[4] + 1).toFixed(1);

      const osLabels = [state.scopeIOS ? "iOS (Xcode/Swift)" : null, state.scopeAndroid ? "Android (Android Studio/Kotlin)" : null].filter(Boolean);
      const osText = osLabels.length ? osLabels.join(" et ") : "iOS et Android";
      phasesDef[2].d = `Connexion des flux d'évènements applicatifs, configuration des règles de traitement. Inclut l'intégration SDK native pour ${osText} et les tests sur simulateur/device — ${nOS} plateforme${nOS > 1 ? "s" : ""} sélectionnée${nOS > 1 ? "s" : ""}.`;
      phasesDef[4].d = "Fonctionnement en double run, surveillance, ajustements avant déploiement — marge de publication en store (revue Apple/Google) incluse, voir note ci-dessus.";
    }

    state.phases = phasesDef.map((ph, i) => ({ t: ph.t, d: ph.d, days: days[i] }));

    setRangeValue("mininst", p.mininst, String(p.mininst));
    setRangeValue("vcpu", p.vcpu, String(p.vcpu));
    setRangeValue("mem", p.mem, String(p.mem));
    setRangeValue("reqps", p.reqps, String(p.reqps));
    setRangeValue("dur", p.dur, String(p.dur));
    setRangeValue("conc", p.conc, String(p.conc));
    setRangeValue("load", p.load, "×" + p.load.toFixed(1));

    $all<HTMLButtonElement>(".msim-lvl-card").forEach((c) => {
      const active = c.dataset.level === level;
      c.setAttribute("aria-pressed", String(active));
    });
    render();
    renderTimeline();
  }

  function setRangeValue(id: string, value: number, label: string) {
    const input = $<HTMLInputElement>(id);
    if (input) input.value = String(value);
    setText("v-" + id, label);
  }

  $<HTMLInputElement>("scope-ios")?.addEventListener("change", () => {
    state.scopeIOS = $<HTMLInputElement>("scope-ios")!.checked;
    applyLevel(state.level);
  });
  $<HTMLInputElement>("scope-android")?.addEventListener("change", () => {
    state.scopeAndroid = $<HTMLInputElement>("scope-android")!.checked;
    applyLevel(state.level);
  });

  $("add-event-btn")?.addEventListener("click", () => {
    state.phases.push({ t: "Nouvelle étape", d: "Description à préciser.", days: 1 });
    renderTimeline();
    render();
  });

  function bindRange(id: string, key: keyof SimState, fmt: (v: number) => string) {
    const el = $<HTMLInputElement>(id);
    el?.addEventListener("input", () => {
      (state[key] as number) = parseFloat(el.value);
      setText("v-" + id, fmt(state[key] as number));
      render();
    });
  }
  bindRange("sessions", "sessions", (v) => new Intl.NumberFormat("fr-FR").format(v));
  bindRange("domains", "domains", (v) => String(v));
  bindRange("tjm", "tjm", (v) => v + " €/j");

  $("recap-days-input")?.addEventListener("change", () => {
    const v = parseFloat($<HTMLInputElement>("recap-days-input")!.value);
    setTotalDays(v);
    renderTimeline();
    render();
  });
  $("recap-tjm")?.addEventListener("input", () => {
    state.tjm = parseFloat($<HTMLInputElement>("recap-tjm")!.value);
    const tjmInput = $<HTMLInputElement>("tjm");
    if (tjmInput) tjmInput.value = String(state.tjm);
    setText("v-tjm", state.tjm + " €/j");
    render();
  });
  bindRange("margin", "margin", (v) => v + " %");
  bindRange("mininst", "mininst", (v) => String(v));
  bindRange("vcpu", "vcpu", (v) => String(v));
  bindRange("mem", "mem", (v) => String(v));
  bindRange("reqps", "reqps", (v) => String(v));
  bindRange("dur", "dur", (v) => String(v));
  bindRange("conc", "conc", (v) => String(v));
  bindRange("load", "load", (v) => "×" + v.toFixed(1));
  bindRange("resp", "resp", (v) => String(v));
  bindRange("log", "log", (v) => String(v));
  bindRange("maint", "maint", (v) => v + " h/mois");

  $("ret")?.addEventListener("change", () => {
    state.ret = parseFloat($<HTMLSelectElement>("ret")!.value);
    render();
  });

  $all<HTMLButtonElement>(".msim-lvl-card").forEach((c) => c.addEventListener("click", () => applyLevel(c.dataset.level as SimState["level"])));

  function setupToggle(switchRowId: string, key: "lb" | "marginOn", extra?: () => void) {
    const row = $<HTMLButtonElement>(switchRowId);
    row?.addEventListener("click", () => {
      state[key] = !state[key];
      row.setAttribute("aria-checked", String(state[key]));
      if (extra) extra();
      render();
    });
  }
  setupToggle("lb-toggle-row", "lb");
  setupToggle("margin-toggle-row", "marginOn", () => {
    const field = $("margin-field");
    if (field) field.style.display = state.marginOn ? "block" : "none";
  });

  $("reset-btn")?.addEventListener("click", () => {
    state.sessions = 200000;
    state.domains = 1;
    state.tjm = 650;
    state.marginOn = false;
    state.margin = 20;
    state.resp = 3;
    state.log = 1.5;
    state.ret = 0;
    state.lb = false;
    state.maint = 6;
    setRangeValue("sessions", 200000, "200 000");
    setRangeValue("domains", 1, "1");
    setRangeValue("tjm", 650, "650 €/j");
    $("margin-toggle-row")?.setAttribute("aria-checked", "false");
    const marginField = $("margin-field");
    if (marginField) marginField.style.display = "none";
    setRangeValue("resp", 3, "3");
    setRangeValue("log", 1.5, "1.5");
    const retSelect = $<HTMLSelectElement>("ret");
    if (retSelect) retSelect.value = "0";
    $("lb-toggle-row")?.setAttribute("aria-checked", "false");
    setRangeValue("maint", 6, "6 h/mois");
    state.level = "standard";
    applyPlatform("web");
  });

  $("export-btn")?.addEventListener("click", () => {
    const r = compute();
    const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const levelLabel = { simple: "Simple", standard: "Standard", avance: "Avancé" }[state.level];
    const rows = state.phases.map((p, i) => `<tr><td>${i + 1}. ${p.t}</td><td>${p.d}</td><td style="text-align:right;">${p.days} j</td></tr>`).join("");
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset="utf-8"><title>Estimation tracking server-side</title>
      <style>
        body{font-family:Calibri, Arial, sans-serif; color:#1a1a1a; font-size:11pt;}
        h1{font-size:18pt; margin-bottom:4pt;}
        h2{font-size:13pt; margin-top:20pt; margin-bottom:6pt; border-bottom:1px solid #ccc; padding-bottom:4pt;}
        table{border-collapse:collapse; width:100%; margin:8pt 0;}
        td,th{border:1px solid #ccc; padding:6pt 8pt; text-align:left; font-size:10pt;}
        th{background:#f2f2f2;}
        .muted{color:#666; font-size:9pt;}
      </style></head>
      <body>
        <h1>Estimation — migration tracking server-side</h1>
        <p class="muted">Document généré le ${date}.</p>

        <h2>Hypothèses</h2>
        <table>
          <tr><th>Paramètre</th><th>Valeur</th></tr>
          <tr><td>Plateforme</td><td>${state.platform === "mobile" ? "Application mobile" : "Site web"}</td></tr>
          ${
            state.platform === "mobile"
              ? `<tr><td>Périmètre technique natif</td><td>${
                  [state.scopeIOS ? "iOS (Xcode/Swift)" : null, state.scopeAndroid ? "Android (Android Studio/Kotlin)" : null].filter(Boolean).join(" + ") || "à préciser"
                }</td></tr>`
              : ""
          }
          <tr><td>${PLATFORM_TEXT[state.platform].sessionsLabel}</td><td>${fmtNum(state.sessions)}</td></tr>
          <tr><td>${PLATFORM_TEXT[state.platform].domainsFieldLabel}</td><td>${state.domains}</td></tr>
          <tr><td>Niveau de complexité</td><td>${levelLabel}</td></tr>
          <tr><td>Taux jour appliqué</td><td>${state.tjm} €/jour${state.marginOn ? " (marge " + state.margin + "% incluse)" : ""}</td></tr>
        </table>

        <h2>Budget indicatif</h2>
        <table>
          <tr><th>Poste</th><th>Montant</th></tr>
          <tr><td>Infrastructure — mensuel</td><td>${fmtEUR(r.infraMonthlyEUR)}</td></tr>
          <tr><td>Infrastructure — annuel</td><td>${fmtEUR(r.infraAnnualEUR)}</td></tr>
          <tr><td>Accompagnement (mise en œuvre)</td><td>${fmtEUR(r.implementationEUR)} — ${r.days} jours</td></tr>
          <tr><td>Maintenance — annuelle</td><td>${fmtEUR(r.maintenanceAnnualEUR)}</td></tr>
          <tr><td><b>Total année 1</b></td><td><b>${fmtEUR(r.year1)}</b></td></tr>
          <tr><td>Total année suivante (récurrent)</td><td>${fmtEUR(r.yearNplus)}</td></tr>
          <tr><td>Total sur 5 ans</td><td>${fmtEUR(r.tco5)}</td></tr>
        </table>

        <h2>Feuille de route</h2>
        <table>
          <tr><th>Étape</th><th>Description</th><th>Durée</th></tr>
          ${rows}
          <tr><td colspan="2"><b>Total</b></td><td style="text-align:right;"><b>${r.days} jours</b></td></tr>
        </table>

        <p class="muted">Estimation à but de cadrage budgétaire, construite à partir des grilles tarifaires publiques de l'infrastructure cloud utilisée. Conversion de devise approximative. Un devis réel reste nécessaire avant tout engagement contractuel.</p>
      </body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estimation-tracking-server-side.doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const startInput = $<HTMLInputElement>("tl-start");
  if (startInput) startInput.value = state.startDate.toISOString().slice(0, 10);
  startInput?.addEventListener("change", () => {
    const v = startInput.value;
    if (v) {
      state.startDate = new Date(v + "T00:00:00");
      renderTimeline();
    }
  });
  $all<HTMLButtonElement>(".msim-tl-gran button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $all<HTMLButtonElement>(".msim-tl-gran button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      state.granularity = btn.dataset.g as "day" | "week";
      renderTimeline();
    });
  });

  $("tl-zoom-out")?.addEventListener("click", () => {
    state.timelineZoom = Math.max(ZOOM_MIN, +(state.timelineZoom - ZOOM_STEP).toFixed(2));
    renderTimeline();
  });
  $("tl-zoom-in")?.addEventListener("click", () => {
    state.timelineZoom = Math.min(ZOOM_MAX, +(state.timelineZoom + ZOOM_STEP).toFixed(2));
    renderTimeline();
  });
  $("tl-zoom-reset")?.addEventListener("click", () => {
    state.timelineZoom = 1;
    renderTimeline();
  });

  function applyPlatform(platform: "web" | "mobile") {
    state.platform = platform;
    const t = PLATFORM_TEXT[platform];

    $all<HTMLButtonElement>(".msim-ps-btn").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.platform === platform)));

    setText("ctx-title", t.ctxTitle);
    const p1 = $("ctx-p1");
    if (p1) p1.innerHTML = t.ctxP1;
    setText("ctx-p2", t.ctxP2);
    setText("ctx-p3", t.ctxP3);
    setText("ctx-row-domain-label", t.domainLabel);
    setText("ctx-row-domain-value", t.domainValue);
    setText("sessions-label", t.sessionsLabel);
    const sessionsRange = $<HTMLInputElement>("sessions");
    sessionsRange?.setAttribute("aria-label", t.sessionsLabel);
    setText("domains-label", t.domainsFieldLabel);
    $<HTMLInputElement>("domains")?.setAttribute("aria-label", t.domainsFieldLabel);
    setText("domains-hint", t.domainsHint);
    setText("reqps-label", t.reqpsLabel);
    $<HTMLInputElement>("reqps")?.setAttribute("aria-label", t.reqpsLabel);

    const isMobile = platform === "mobile";
    const scopeField = $("mobile-scope-field");
    if (scopeField) scopeField.style.display = isMobile ? "block" : "none";
    const storeCallout = $("mobile-store-callout");
    if (storeCallout) storeCallout.style.display = isMobile ? "block" : "none";

    applyLevel(state.level);
  }

  $all<HTMLButtonElement>(".msim-ps-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPlatform(btn.dataset.platform as "web" | "mobile"));
  });

  // État initial, éventuellement personnalisé via `config` (réutilisation du
  // composant avec d'autres valeurs par défaut que celles du widget d'origine).
  state.level = config.initialLevel ?? "standard";
  applyPlatform(config.initialPlatform ?? "web");

  return () => {
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimer);
    revealObserver?.disconnect();
  };
}
