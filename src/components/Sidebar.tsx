export default function Sidebar({
  menu: _menu,
  page,
  setPage,
  getIcon,
  collapsed,
  setCollapsed,
}: {
  menu: string[];
  page: string;
  setPage: (p: any) => void;
  getIcon: (p: any) => string;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}) {
  const groups = [
    { title: 'MONITORING', items: ['Dashboard', 'Live Weather', 'Live Events', 'India Map'] },
    { title: 'ANALYTICS', items: ['Analytics', 'Reports'] },
    { title: 'ADMINISTRATION', items: ['Admin Panel', 'Sources'] },
    { title: 'SYSTEM', items: ['Settings', 'Help'] },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-logo">VD</div>

        <div>
          <h2>VayuDrishti</h2>
          <p>National Weather Intelligence</p>
        </div>
      </div>

      <div className="sidebar-groups">
        {groups.map((group) => (
          <div key={group.title} className="menu-group">
            <div className="menu-title">{group.title}</div>
            <nav>
              {group.items.map((item) => (
                <button
                  key={item}
                  className={`nav-item ${page === item ? 'active' : ''}`}
                  onClick={() => setPage(item)}
                  title={item}
                  aria-label={item}
                >
                  <span className="nav-icon">{getIcon(item)}</span>
                  <span className="sidebar-text">{item}</span>
                  {item === 'Live Events' && <span className="badge">12</span>}
                </button>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-visual-panel">
          <div className="visual-glow"></div>
          <div className="visual-tag">Real-time Weather Intelligence</div>
          <div className="visual-title">for a Safer India</div>
        </div>

        <div className="system-status">
          <span className="live-dot"></span>
          System Online
        </div>

        <button
          className="collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
    </aside>
  );
}
