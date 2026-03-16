import { Link } from "react-router-dom";

import { shellRoutes } from "../app/routes";
import { useThemeStore } from "../app/theme";

import styles from "./Dashboard.module.css";

const dashboardRoutes = shellRoutes.filter((route) => route.showInDashboard);

export default function Dashboard() {
  const { themePreference, setThemePreference, resolvedTheme } = useThemeStore();

  return (
    <div className={styles.dashboard}>
      <section className={`panel-card ${styles.heroCard}`}>
        <div className={styles.heroHeader}>
          <div className={styles.heroCopy}>
            <span className="ops-eyebrow">Operations Overview</span>
            <h1 className="ops-title">Operational Dashboard</h1>
            <p className="ops-subtitle">Command center for the current facility shift. Move quickly between member, membership, reservation, and product work with consistent state and theme visibility.</p>
            <div className="ops-meta">
              <span className="ops-meta__pill">Representative surface</span>
              <span className="ops-meta__pill">Theme control</span>
              <span className="ops-meta__pill">Quick entry routes</span>
            </div>
          </div>
          <div className={styles.themeControl}>
            <span className={styles.themeLabel}>Appearance</span>
            <div className={styles.themeGroup}>
              <button
                type="button"
                className={`${themePreference === "light" ? "primary-button" : "secondary-button"} ${styles.themeButton}`}
                onClick={() => setThemePreference("light")}
              >
                Light
              </button>
              <button
                type="button"
                className={`${themePreference === "dark" ? "primary-button" : "secondary-button"} ${styles.themeButton}`}
                onClick={() => setThemePreference("dark")}
              >
                Dark
              </button>
              <button
                type="button"
                className={`${themePreference === "system" ? "primary-button" : "secondary-button"} ${styles.themeButton}`}
                onClick={() => setThemePreference("system")}
              >
                Auto
              </button>
            </div>
            <span className="text-xs text-muted">Resolved theme: {resolvedTheme.toUpperCase()}</span>
          </div>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Active Modules</span>
            <span className={styles.metricValue}>{dashboardRoutes.length}</span>
            <span className={styles.metricHint}>Quick-entry work areas available from this dashboard.</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Sidebar Navigation</span>
            <span className={styles.metricValue}>{shellRoutes.filter((route) => route.showInSidebar).length}</span>
            <span className={styles.metricHint}>Persistent routes visible in the shell.</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Console Mode</span>
            <span className={styles.metricValue}>{resolvedTheme === "dark" ? "Night" : "Day"}</span>
            <span className={styles.metricHint}>Current visual environment for the operator shift.</span>
          </div>
        </div>
      </section>

      <section className="ops-section">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">Quick Entry Routes</h2>
            <p className="ops-section__subtitle">Jump straight into the most active operational slices without traversing the full shell manually.</p>
          </div>
        </div>

        <div className={styles.moduleGrid}>
          {dashboardRoutes.map((route) => (
            <Link key={route.key} to={route.path} className={`panel-card ${styles.moduleCard}`}>
              <div className={styles.moduleHeader}>
                <div>
                  <h3 className={styles.moduleTitle}>{route.label}</h3>
                  <p className={styles.moduleDescription}>{route.description}</p>
                </div>
                <span className="pill info">{route.key.toUpperCase()}</span>
              </div>
              <div className={styles.moduleMeta}>
                <span className={styles.modulePill}>Protected</span>
                <span className={styles.modulePill}>Shell route</span>
              </div>
              <span className={styles.moduleArrow}>Open Module</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className={`panel-card ${styles.footerCard}`}>
        <span className="text-xs text-muted">Field Operations Console representative dashboard surface</span>
        <span className="text-xs text-muted">Current environment resolved to {resolvedTheme.toUpperCase()}</span>
      </footer>
    </div>
  );
}
