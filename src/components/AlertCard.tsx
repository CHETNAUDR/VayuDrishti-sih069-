export default function AlertCard({ alert }: { alert: any }) {
  return (
    <div className="report-card" style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <h3 style={{ margin: 0 }}>{alert.title}</h3>
        <p style={{ margin: '6px 0 0', color: 'var(--vd-muted)' }}>{alert.description}</p>
      </div>

      <div style={{ textAlign: 'right' }}>
        <small style={{ color: 'var(--vd-muted)' }}>{alert.issue_time || alert.pubDate}</small>
      </div>
    </div>
  );
}
