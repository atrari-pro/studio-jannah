import { NetworkRequest } from '../types/scan';

interface NetworkTableProps {
  requests: NetworkRequest[];
}

export default function NetworkTable({ requests }: NetworkTableProps) {
  if (requests.length === 0) {
    return <p className="empty-state">Aucune requête capturée</p>;
  }

  // Filtrer les requêtes tracking/analytics/media uniquement
  const relevantRequests = requests.filter(
    r => r.category === 'tracking' || r.category === 'analytics' || r.category === 'media'
  );

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'analytics': return '#4A90E2';
      case 'tracking': return '#FF6B6B';
      case 'media': return '#FFA500';
      default: return '#95A5A6';
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'analytics': return 'Analytics';
      case 'tracking': return 'Tracking';
      case 'media': return 'Media';
      default: return 'Autre';
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="data-table">
      <div className="table-header">
        <span className="table-count">{relevantRequests.length} requêtes tracking/analytics/media</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Domaine</th>
            <th>Type</th>
            <th>Méthode</th>
            <th>Paramètres</th>
          </tr>
        </thead>
        <tbody>
          {relevantRequests.slice(0, 50).map((req, index) => (
            <tr key={index}>
              <td className="domain-cell">
                <span className="domain-name">{getDomain(req.url)}</span>
              </td>
              <td>
                <span 
                  className="category-badge" 
                  style={{ backgroundColor: getCategoryColor(req.category) }}
                >
                  {getCategoryLabel(req.category)}
                </span>
              </td>
              <td className="method-cell">
                <code>{req.method}</code>
              </td>
              <td className="params-cell">
                {req.params && Object.keys(req.params).length > 0 ? (
                  <details>
                    <summary>{Object.keys(req.params).length} params</summary>
                    <pre>{JSON.stringify(req.params, null, 2)}</pre>
                  </details>
                ) : (
                  <span className="empty-params">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
