import { Link } from "react-router-dom";

import { shellRoutes } from "../app/routes";
import { useThemeStore } from "../app/theme";

const dashboardRoutes = shellRoutes.filter((route) => route.showInDashboard);

export default function Dashboard() {
  const { themePreference, setThemePreference, resolvedTheme } = useThemeStore();

  return (
    <div className="stack-lg">
      <header className="panel-card-header">
        <div>
          <h1 className="brand-title" style={{ fontSize: '2rem' }}>Operational Dashboard</h1>
          <p className="text-muted text-sm">System integrity confirmed. Active workload across {dashboardRoutes.length} functional areas.</p>
        </div>
        <div className="row-actions">
           <span className="text-xs text-muted" style={{ fontWeight: 700, alignSelf: 'center', marginRight: '8px' }}>APPEARANCE</span>
           <div className="row-actions" style={{ background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-minimal)' }}>
              <button 
                type="button"
                className={themePreference === "light" ? "primary-button" : "secondary-button"}
                style={{ padding: '6px 12px', fontSize: '12px', border: '0' }}
                onClick={() => setThemePreference("light")}
              >
                Light
              </button>
              <button 
                type="button"
                className={themePreference === "dark" ? "primary-button" : "secondary-button"}
                style={{ padding: '6px 12px', fontSize: '12px', border: '0' }}
                onClick={() => setThemePreference("dark")}
              >
                Dark
              </button>
              <button 
                type="button"
                className={themePreference === "system" ? "primary-button" : "secondary-button"}
                style={{ padding: '6px 12px', fontSize: '12px', border: '0' }}
                onClick={() => setThemePreference("system")}
              >
                Auto
              </button>
           </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {dashboardRoutes.map((route) => (
          <Link key={route.key} to={route.path} className="panel-card" style={{ textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div className="stack-sm">
              <strong className="text-sm" style={{ color: 'var(--text-main)', fontSize: '1.125rem' }}>{route.label}</strong>
              <p className="text-muted text-sm" style={{ margin: 0 }}>{route.description}</p>
              <div className="mt-sm" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span className="text-xs" style={{ fontWeight: 700, color: 'var(--status-info)' }}>OPEN MODULE →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <footer className="panel-card" style={{ background: 'var(--bg-base)', borderStyle: 'dashed' }}>
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <span className="text-xs text-muted">Field Operations Console v2.0.0-phase1</span>
          <span className="text-xs text-muted">Connected to: {resolvedTheme.toUpperCase()} ENVIRONMENT</span>
        </div>
      </footer>
    </div>
  );
}
