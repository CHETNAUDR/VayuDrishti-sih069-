export default function Header({
  page: _page,
  collapsed,
  setCollapsed,
}: {
  page: string;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}) {
  const now = new Date();

  return (
    <header className="header">
      <div className="header-brand-wrap">
        <div className="header-brand-mark">VD</div>
        <div>
          <p className="eyebrow">VAYUDRISHTI / NATIONAL WEATHER INTELLIGENCE</p>
          <h1>VayuDrishti</h1>
          <div className="header-tagline">Smarter Insights. Safer Tomorrow.</div>
        </div>
      </div>

      <div className="header-center">
        <div className="header-live-pill">
          <span className="live-dot"></span>
          LIVE DATA
        </div>
        <div className="header-time-box">
          <span className="tiny-label">Last Updated</span>
          <strong>{now.toLocaleString()}</strong>
        </div>
      </div>

      <div className="header-actions">
        <button className="header-icon-button" aria-label="Weather status">
          ☁
        </button>
        <button className="header-icon-button" aria-label="Notifications">
          🔔
        </button>
        <button className="header-icon-button" aria-label="Theme toggle" onClick={() => setCollapsed(!collapsed)}>
          ◐
        </button>
        <div className="admin-chip">
          <div className="avatar">O</div>
          <div>
            <strong>Ops</strong>
            <span>Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
