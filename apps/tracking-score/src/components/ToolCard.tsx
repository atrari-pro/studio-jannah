import { DetectionResult } from '../types/scan';

interface ToolCardProps {
  title: string;
  icon: string;
  tool: DetectionResult | null;
  tools?: DetectionResult[]; // Pour attribution et A/B testing
}

export default function ToolCard({ title, icon, tool, tools }: ToolCardProps) {
  const hasMultiple = tools && tools.length > 0;
  const hasSingle = tool && tool.detected;

  if (!hasMultiple && !hasSingle) {
    return (
      <div className="tool-card not-detected">
        <div className="tool-card-header">
          <span className="tool-icon">{icon}</span>
          <h3>{title}</h3>
        </div>
        <p className="tool-status">❓ Non détecté</p>
      </div>
    );
  }

  return (
    <div className="tool-card detected">
      <div className="tool-card-header">
        <span className="tool-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      
      {hasSingle && (
        <div className="tool-info">
          <div className="tool-name">
            <strong>{tool.name}</strong>
            <span className="detection-badge">{tool.method === 'auto' ? '✅ Auto' : '🔧 Manuel'}</span>
          </div>
          {tool.details?.docs && (
            <a 
              href={tool.details.docs} 
              target="_blank" 
              rel="noopener noreferrer"
              className="tool-doc-link"
            >
              📚 Documentation
            </a>
          )}
          {tool.details?.containerId && (
            <div className="tool-detail">
              <code>{tool.details.containerId}</code>
            </div>
          )}
        </div>
      )}

      {hasMultiple && (
        <div className="tool-list">
          {tools.map((t, i) => (
            <div key={i} className="tool-item">
              <div className="tool-item-name">
                <strong>{t.name}</strong>
                <span className="detection-badge">{t.method === 'auto' ? '✅' : '🔧'}</span>
              </div>
              {t.details?.docs && (
                <a 
                  href={t.details.docs} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tool-doc-link-small"
                >
                  📚 Doc
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
