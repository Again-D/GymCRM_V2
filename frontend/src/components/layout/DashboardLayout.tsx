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
          GymCRM Ops
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
              <div className="row-actions" style={{ gap: '4px' }}>
                <button 
                  type="button" 
                  className="secondary-button" 
                  style={{ padding: '6px 8px', fontSize: '11px', flex: 1 }}
                  onClick={() => setRuntimeAuthPreset("prototype-admin")}
                >
                  Proto
                </button>
                <button 
                  type="button" 
                  className="secondary-button" 
                  style={{ padding: '6px 8px', fontSize: '11px', flex: 1 }}
                  onClick={() => setRuntimeAuthPreset("jwt-admin")}
                >
                  Admin
                </button>
                <button 
                  type="button" 
                  className="secondary-button" 
                  style={{ padding: '6px 8px', fontSize: '11px', flex: 1 }}
                  onClick={clearRuntimeSession}
                >
                  Clear
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="secondary-button" 
                style={{ width: '100%', padding: '8px' }}
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
      </aside>

      <main className={styles["app-shell__main"]}>
        <Outlet />
      </main>
    </div>
  );
}
