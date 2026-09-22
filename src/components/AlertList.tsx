function Badge({ sev }: { sev?: string }) {
  const map: any = {
    high: 'var(--vd-critical)',
    medium: 'var(--vd-warning)',
    low: 'var(--vd-secondary)',
    official: 'var(--vd-live)',
  };
  const color = map[(sev || '').toLowerCase()] || '#5ea1ff';
  return (
    <span className="alert-badge" style={{ background: color }} />
  );
}

export default function AlertList({ alerts }: { alerts: any[] }) {
  return (
    <div className="alert-list">
      <div className="alert-list-header">
        <h4>Official Weather Alerts</h4>
      </div>

      <div className="alert-items">
        {(alerts || []).slice(0, 6).map((a: any, idx: number) => (
          <div className="alert-item" key={a.id || a.guid || idx}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge sev={a.severity || a.level || a.priority} />
              <div>
                <strong style={{ display: 'block' }}>{a.title || a.description?.slice?.(0, 40) || 'Weather alert'}</strong>
                <small style={{ color: 'var(--vd-muted)' }}>{a.pubDate || a.issue_time || ''}</small>
              </div>
            </div>
            <div className="alert-right">
              <small style={{ color: 'var(--vd-muted)' }}>{a.region || a.state || ''}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
