import { DataLayerEvent } from '../types/scan';

interface DataLayerTableProps {
  events: DataLayerEvent[];
}

export default function DataLayerTable({ events }: DataLayerTableProps) {
  if (events.length === 0) {
    return <p className="empty-state">Aucun event dataLayer capturé</p>;
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'navigation': return '#4A90E2';
      case 'engagement': return '#7B68EE';
      case 'ecommerce': return '#50C878';
      case 'form': return '#FF6B6B';
      case 'consent': return '#FFA500';
      case 'custom': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Event</th>
            <th>Catégorie</th>
            <th>Données</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.index}>
              <td className="index-cell">{event.index}</td>
              <td className="event-cell">
                <code>{event.event}</code>
              </td>
              <td>
                {event.category && (
                  <span 
                    className="category-badge" 
                    style={{ backgroundColor: getCategoryColor(event.category) }}
                  >
                    {event.category}
                  </span>
                )}
              </td>
              <td className="data-cell">
                <details>
                  <summary>Voir données ({Object.keys(event.data).length} clés)</summary>
                  <pre>{JSON.stringify(event.data, null, 2)}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
