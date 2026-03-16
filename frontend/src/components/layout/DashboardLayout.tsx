import { NavLink, Outlet } from "react-router-dom";

import { useAuthState } from "../../app/auth";
import type { ShellRoute } from "../../app/routes";

import styles from "./DashboardLayout.module.css";

export default function DashboardLayout({ routes }: { routes: ShellRoute[] }) {
  const {
    authError,
    authStatusMessage,
    authUser,
    clearRuntimeSession,
    isMockMode,
    logout,
    securityMode,
    setRuntimeAuthPreset
  } = useAuthState();

  return (
    <div className={styles["app-shell"]}>
      <aside className={styles["app-shell__sidebar"]}>
        <div className={styles["app-shell__brand"]}>
          <span className={styles["brand-kicker"]}>Field Ops</span>
          <span>GymCRM Ops</span>
        </div>
        
        <div className={styles["auth-panel"]}>
          <div className={styles["auth-header"]}>
            <span className={styles["auth-label"]}>
              {isMockMode ? "Runtime Profile" : "Live Session"}
            </span>
            <span className={styles["auth-user"]}>
              {securityMode === "prototype" ? "System Prototype" : authUser?.username ?? "Anonymous Operator"}
            </span>
            {authUser && (
              <span className={styles["auth-meta"]}>
                {authUser.role} · {authUser.email}
              </span>
            )}
          </div>

          <div className="stack-sm">
            {isMockMode ? (
              <div className={styles["auth-actions"]}>
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={() => setRuntimeAuthPreset("prototype-admin")}
                >
                  Proto
                </button>
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={() => setRuntimeAuthPreset("jwt-admin")}
                >
                  Admin
                </button>
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={clearRuntimeSession}
                >
                  Clear
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className={`secondary-button ${styles["signout-button"]}`}
                onClick={() => void logout()}
              >
                Sign Out
              </button>
            )}
          </div>
          
          {(authStatusMessage || authError) && (
            <div className="mt-xs">
              {authStatusMessage && <span className="text-success text-xs">{authStatusMessage}</span>}
              {authError && <span className="text-danger text-xs">{authError}</span>}
            </div>
          )}
        </div>

        <nav className={styles["app-nav"]}>
          {routes.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `${styles["app-nav__link"]}${isActive ? ` ${styles["is-active"]}` : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles["sidebar-footer"]}>
          <span className="text-xs">Representative shell surface</span>
          <span className="text-xs">Mode: {securityMode === "prototype" ? "Prototype rehearsal" : "JWT session"}</span>
        </div>
      </aside>

      <main className={styles["app-shell__main"]}>
        <Outlet />
      </main>
    </div>
  );
}
