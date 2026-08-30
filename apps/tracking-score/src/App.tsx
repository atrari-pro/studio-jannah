import { useState, useEffect } from 'react';
import { ScanState, CompleteScanReport } from './types/scan';
import ToolCard from './components/ToolCard';
import DataLayerTable from './components/DataLayerTable';
import NetworkTable from './components/NetworkTable';
import AuditReport from './components/AuditReport';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [report, setReport] = useState<CompleteScanReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tools']));
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (scanState?.status === 'scanning') {
      interval = setInterval(async () => {
        const state = await window.electronAPI.getScanState();
        setScanState(state);
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanState?.status]);

  const handleStartScan = async () => {
    if (!url.trim()) return;

    setReport(null);
    setScanError(null);
    const result = await window.electronAPI.startScan(url);

    if (result.success) {
      const state = await window.electronAPI.getScanState();
      setScanState(state);
      setExpandedSections(new Set(['tools', 'datalayer', 'network']));
    } else {
      setScanError(result.error || "Impossible de lancer l'analyse.");
    }
  };

  const handleFinishScan = async () => {
    setIsGeneratingReport(true);
    try {
      const result = await window.electronAPI.finishScan();
      if (result.success && result.report) {
        setReport(result.report);
        setScanState(null);
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleMarkAccepted = async () => {
    await window.electronAPI.markConsentAccepted();
    const state = await window.electronAPI.getScanState();
    setScanState(state);
  };

  const handleMarkRefused = async () => {
    await window.electronAPI.markConsentRefused();
    const state = await window.electronAPI.getScanState();
    setScanState(state);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleNewAnalysis = () => {
    setReport(null);
    setScanState(null);
    setScanError(null);
    setUrl('');
  };

  const totalTools = scanState ? 
    (scanState.observations.cmp?.detected ? 1 : 0) +
    (scanState.observations.tms?.detected ? 1 : 0) +
    (scanState.observations.analytics?.detected ? 1 : 0) +
    scanState.observations.attribution.length +
    scanState.observations.abTesting.length : 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Studio Jannah Tracking Score</h1>
        <p className="subtitle">Audit tracking web professionnel — Méthodologie 2026</p>
      </header>

      <main className="app-main">
        {!scanState && !report && (
          <div className="start-panel">
            <label htmlFor="url-input">URL à analyser</label>
            <div className="url-input-group">
              <input
                id="url-input"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartScan()}
              />
              <button onClick={handleStartScan} className="btn-primary">
                🚀 Lancer l'analyse
              </button>
            </div>
            {scanError && (
              <p className="start-error" role="alert">⚠️ {scanError}</p>
            )}
            <p className="start-hint">
              Un navigateur s'ouvrira — naviguez normalement pendant que l'outil observe
            </p>
            <div className="scoring-info">
              <h3>🎯 Grille de scoring professionnelle</h3>
              <ul>
                <li><strong>CMP</strong> (30 pts) : Conformité RGPD, blocage pré-consent, Consent Mode v2</li>
                <li><strong>TMS</strong> (20 pts) : Gouvernance tags, container ID, respect consentement</li>
                <li><strong>Analytics</strong> (25 pts) : Qualité données GA4, events recommandés, paramètres</li>
                <li><strong>DataLayer</strong> (25 pts) : Nomenclature snake_case, structure e-commerce</li>
                <li><strong>Performance</strong> (20 pts) : PageSpeed Insights (Perf, A11y, SEO, Best Practices)</li>
                <li><strong>Bonus Consent Mode v2</strong> (10 pts) : 4 paramètres v2, default denied</li>
              </ul>
              <p className="scoring-total"><strong>Score max :</strong> 120 points</p>
            </div>
          </div>
        )}

        {scanState && (
          <div className="dashboard">
            <div className="dashboard-header">
              <div className="url-info">
                <strong>URL :</strong> <span>{scanState.url}</span>
              </div>
              <div className="dashboard-stats">
                <span className="stat-item">
                  🔧 {totalTools} outil{totalTools > 1 ? 's' : ''} détecté{totalTools > 1 ? 's' : ''}
                </span>
                <span className="stat-item">
                  📊 {scanState.observations.dataLayer.length} events
                </span>
                <span className="stat-item">
                  🌐 {scanState.observations.networkRequests.filter(r => r.category !== 'resource').length} requêtes
                </span>
              </div>
            </div>

            {/* Section Outils détectés */}
            <section className="dashboard-section">
              <div className="section-header" onClick={() => toggleSection('tools')}>
                <h2>🔍 Outils détectés</h2>
                <button className="expand-btn">
                  {expandedSections.has('tools') ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.has('tools') && (
                <div className="section-content">
                  <div className="tools-grid">
                    <ToolCard 
                      title="CMP" 
                      icon="🍪" 
                      tool={scanState.observations.cmp} 
                    />
                    <ToolCard 
                      title="TMS" 
                      icon="📦" 
                      tool={scanState.observations.tms} 
                    />
                    <ToolCard 
                      title="Analytics" 
                      icon="📈" 
                      tool={scanState.observations.analytics} 
                    />
                    <ToolCard 
                      title="Attribution" 
                      icon="🎯" 
                      tool={null}
                      tools={scanState.observations.attribution} 
                    />
                    <ToolCard 
                      title="A/B Testing" 
                      icon="🧪" 
                      tool={null}
                      tools={scanState.observations.abTesting} 
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Section États consentement */}
            <section className="dashboard-section">
              <div className="section-header" onClick={() => toggleSection('consent')}>
                <h2>✋ Gestion du consentement</h2>
                <button className="expand-btn">
                  {expandedSections.has('consent') ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.has('consent') && (
                <div className="section-content">
                  <div className="consent-panel">
                    <div className="consent-instructions">
                      <p><strong>1.</strong> Naviguez sur le site dans le navigateur ouvert</p>
                      <p><strong>2.</strong> Après avoir accepté ou refusé les cookies, cliquez ci-dessous :</p>
                    </div>
                    <div className="consent-actions">
                      <button 
                        onClick={handleMarkAccepted}
                        className={`btn-consent ${scanState.observations.states.accepted ? 'active' : ''}`}
                      >
                        {scanState.observations.states.accepted ? '✅' : '⬜'} J'ai accepté les cookies
                      </button>
                      <button 
                        onClick={handleMarkRefused}
                        className={`btn-consent ${scanState.observations.states.refused ? 'active' : ''}`}
                      >
                        {scanState.observations.states.refused ? '✅' : '⬜'} J'ai refusé les cookies
                      </button>
                    </div>
                    <div className="consent-states">
                      <span className={`state-badge ${scanState.observations.states.initial ? 'active' : ''}`}>
                        Initial {scanState.observations.states.initial ? '✅' : '⏳'}
                      </span>
                      <span className={`state-badge ${scanState.observations.states.accepted ? 'active' : ''}`}>
                        Accepté {scanState.observations.states.accepted ? '✅' : '⏳'}
                      </span>
                      <span className={`state-badge ${scanState.observations.states.refused ? 'active' : ''}`}>
                        Refusé {scanState.observations.states.refused ? '✅' : '⬜'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Section DataLayer */}
            <section className="dashboard-section">
              <div className="section-header" onClick={() => toggleSection('datalayer')}>
                <h2>📊 DataLayer ({scanState.observations.dataLayer.length} events)</h2>
                <button className="expand-btn">
                  {expandedSections.has('datalayer') ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.has('datalayer') && (
                <div className="section-content">
                  <DataLayerTable events={scanState.observations.dataLayer} />
                </div>
              )}
            </section>

            {/* Section Requêtes réseau */}
            <section className="dashboard-section">
              <div className="section-header" onClick={() => toggleSection('network')}>
                <h2>🌐 Requêtes réseau</h2>
                <button className="expand-btn">
                  {expandedSections.has('network') ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.has('network') && (
                <div className="section-content">
                  <NetworkTable requests={scanState.observations.networkRequests} />
                </div>
              )}
            </section>

            <div className="dashboard-footer">
              {isGeneratingReport ? (
                <div className="generating-report">
                  <div className="spinner"></div>
                  <div className="generating-text">
                    <strong>Génération du rapport professionnel...</strong>
                    <p>Appel PageSpeed Insights API (30-60s)</p>
                    <p>Calcul des scores et recommandations</p>
                  </div>
                </div>
              ) : (
                <button onClick={handleFinishScan} className="btn-finish">
                  🎯 Terminer l'analyse et générer le rapport
                </button>
              )}
            </div>
          </div>
        )}

        {report && (
          <AuditReport report={report} onNewAnalysis={handleNewAnalysis} />
        )}
      </main>
    </div>
  );
}

export default App;
