import { CompleteScanReport } from '../types/scan';

interface AuditReportProps {
  report: CompleteScanReport;
  onNewAnalysis: () => void;
}

export default function AuditReport({ report, onNewAnalysis }: AuditReportProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellence': return '#34c759';
      case 'production': return '#5ac8fa';
      case 'medium': return '#ff9500';
      case 'low': return '#ff6b6b';
      case 'critical': return '#ff3b30';
      default: return '#8e8e93';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'excellence': return '🏆 Excellence';
      case 'production': return '✅ Production';
      case 'medium': return '⚠️ Moyen';
      case 'low': return '❌ Faible';
      case 'critical': return '🚨 Critique';
      default: return level;
    }
  };

  return (
    <div className="audit-report">
      <div className="audit-report-header">
        <h2>📊 Rapport d'audit professionnel</h2>
        <div className="report-meta">
          <div><strong>URL :</strong> {report.url}</div>
          <div><strong>Date :</strong> {new Date(report.timestamp).toLocaleString('fr-FR')}</div>
          <div><strong>Durée scan :</strong> {Math.round(report.scanDuration / 1000)}s</div>
        </div>
      </div>

      {/* Score total */}
      <div className="score-global">
        <div 
          className="score-circle" 
          style={{ borderColor: getLevelColor(report.level) }}
        >
          <div className="score-value">{Math.round(report.percentage)}</div>
          <div className="score-label">Score</div>
        </div>
        <div className="score-details-global">
          <div className="score-points">
            {report.totalScore} / {report.maxScore} points
          </div>
          <div 
            className="score-level" 
            style={{ color: getLevelColor(report.level) }}
          >
            {getLevelLabel(report.level)}
          </div>
        </div>
      </div>

      {/* Scores par module */}
      <section className="modules-scores">
        <h3>📈 Scores par module</h3>
        <div className="modules-grid">
          {Object.entries(report.modules).map(([key, module]) => (
            <div key={key} className="module-card">
              <div className="module-header">
                <span className="module-name">
                  {key === 'cmp' && '🍪 CMP'}
                  {key === 'tms' && '📦 TMS'}
                  {key === 'analytics' && '📈 Analytics'}
                  {key === 'dataLayer' && '📊 DataLayer'}
                  {key === 'performance' && '⚡ Performance'}
                  {key === 'consentModeV2' && '✅ Consent Mode v2'}
                </span>
                <span className="module-score">
                  {module.obtained}/{module.max}
                </span>
              </div>
              <div className="module-progress">
                <div 
                  className="module-progress-bar" 
                  style={{ 
                    width: `${module.percentage}%`,
                    backgroundColor: 
                      module.level === 'excellent' ? '#34c759' :
                      module.level === 'good' ? '#5ac8fa' :
                      module.level === 'warning' ? '#ff9500' : '#ff3b30'
                  }}
                />
              </div>
              <div className="module-details-summary">
                {module.details.filter(d => d.status === 'pass').length} / {module.details.length} critères validés
              </div>
              <details className="module-details-full">
                <summary>Voir détails</summary>
                <div className="criteria-list">
                  {module.details.map((detail, i) => (
                    <div key={i} className={`criterion ${detail.status}`}>
                      <div className="criterion-header">
                        <span className="criterion-status-icon">
                          {detail.status === 'pass' && '✅'}
                          {detail.status === 'fail' && '❌'}
                          {detail.status === 'partial' && '⚠️'}
                          {detail.status === 'manual' && '🔧'}
                          {detail.status === 'non_determine' && '❓'}
                        </span>
                        <span className="criterion-name">{detail.criterion}</span>
                        <span className="criterion-points">
                          {detail.status === 'non_determine'
                            ? 'non déterminé'
                            : `${detail.points > 0 ? '+' : ''}${detail.points}/${detail.maxPoints}`}
                        </span>
                      </div>
                      <div className="criterion-reason">{detail.reason}</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* Tests comportementaux */}
      <section className="behavioral-tests">
        <h3>🧪 Tests comportementaux</h3>
        <div className="tests-grid">
          <div className={`test-card ${report.behavioralTests.preConsentBlocking.status}`}>
            <div className="test-header">
              <span className="test-icon">
                {report.behavioralTests.preConsentBlocking.status === 'pass' ? '✅' : '❌'}
              </span>
              <span className="test-name">Blocage pré-consentement</span>
            </div>
            <div className="test-result">
              {report.behavioralTests.preConsentBlocking.requestsBeforeConsent} requêtes tracking avant consentement
            </div>
            {report.behavioralTests.preConsentBlocking.violatingDomains.length > 0 && (
              <div className="test-violations">
                <strong>Domaines en violation :</strong>
                <ul>
                  {report.behavioralTests.preConsentBlocking.violatingDomains.map((domain, i) => (
                    <li key={i}><code>{domain}</code></li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={`test-card ${report.behavioralTests.consentRefusal.status}`}>
            <div className="test-header">
              <span className="test-icon">⏳</span>
              <span className="test-name">Respect refus consentement</span>
            </div>
            <div className="test-result">
              Test non effectué (manuel)
            </div>
          </div>

          <div className={`test-card ${report.behavioralTests.consentModeV2.status}`}>
            <div className="test-header">
              <span className="test-icon">⏳</span>
              <span className="test-name">Consent Mode v2</span>
            </div>
            <div className="test-result">
              Test non effectué (vérification paramètres gcs/gcd)
            </div>
          </div>
        </div>
      </section>

      {/* Critères non déterminables — revue manuelle requise */}
      {report.manualReview.length > 0 && (
        <section className="manual-review">
          <h3>❓ Revue manuelle requise ({report.manualReview.length})</h3>
          <p className="manual-review-hint">
            Ces critères sont techniquement indéterminables pour ce scan (CMP non reconnue, structure non
            standard...) — ils sont exclus du score du module, ni positifs ni négatifs.
          </p>
          <ul>
            {report.manualReview.map((item, i) => (
              <li key={i}>
                <strong>{item.module}</strong> — {item.criterion}
                {item.reason && <div className="manual-review-reason">{item.reason}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recommandations */}
      <section className="recommendations">
        <h3>💡 Recommandations priorisées</h3>
        
        {report.recommendations.critical.length > 0 && (
          <div className="recommendations-priority critical">
            <h4>🚨 Critique (P0) — Action immédiate requise</h4>
            <ul>
              {report.recommendations.critical.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {report.recommendations.high.length > 0 && (
          <div className="recommendations-priority high">
            <h4>❗ Haute priorité (P1)</h4>
            <ul>
              {report.recommendations.high.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {report.recommendations.medium.length > 0 && (
          <div className="recommendations-priority medium">
            <h4>⚠️ Moyenne priorité (P2)</h4>
            <ul>
              {report.recommendations.medium.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {report.recommendations.low.length > 0 && (
          <div className="recommendations-priority low">
            <h4>ℹ️ Basse priorité (P3)</h4>
            <ul>
              {report.recommendations.low.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Performance scores (si disponibles) */}
      {report.rawData.performanceScores && (
        <section className="performance-scores">
          <h3>⚡ PageSpeed Insights</h3>
          <div className="performance-grid">
            <div className="perf-score">
              <div className="perf-label">Performance</div>
              <div 
                className="perf-value" 
                style={{ 
                  color: report.rawData.performanceScores.performance >= 90 ? '#34c759' : 
                         report.rawData.performanceScores.performance >= 50 ? '#ff9500' : '#ff3b30' 
                }}
              >
                {report.rawData.performanceScores.performance}
              </div>
            </div>
            <div className="perf-score">
              <div className="perf-label">Accessibilité</div>
              <div 
                className="perf-value" 
                style={{ 
                  color: report.rawData.performanceScores.accessibility >= 90 ? '#34c759' : 
                         report.rawData.performanceScores.accessibility >= 50 ? '#ff9500' : '#ff3b30' 
                }}
              >
                {report.rawData.performanceScores.accessibility}
              </div>
            </div>
            <div className="perf-score">
              <div className="perf-label">SEO</div>
              <div 
                className="perf-value" 
                style={{ 
                  color: report.rawData.performanceScores.seo >= 90 ? '#34c759' : 
                         report.rawData.performanceScores.seo >= 50 ? '#ff9500' : '#ff3b30' 
                }}
              >
                {report.rawData.performanceScores.seo}
              </div>
            </div>
            <div className="perf-score">
              <div className="perf-label">Best Practices</div>
              <div 
                className="perf-value" 
                style={{ 
                  color: report.rawData.performanceScores.bestPractices >= 90 ? '#34c759' : 
                         report.rawData.performanceScores.bestPractices >= 50 ? '#ff9500' : '#ff3b30' 
                }}
              >
                {report.rawData.performanceScores.bestPractices}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="audit-report-footer">
        <button onClick={onNewAnalysis} className="btn-primary">
          🔄 Nouvelle analyse
        </button>
        <button 
          onClick={() => {
            const json = JSON.stringify(report, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
          }}
          className="btn-secondary"
        >
          💾 Exporter JSON
        </button>
      </div>
    </div>
  );
}
