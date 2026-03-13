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
        <strong className={styles["app-shell__brand"]}>GymCRM Rebuild</strong>
        <div className={styles["auth-panel"]}>
          <small className="text-muted">{isMockMode ? "Runtime Auth Preset" : "Live Auth Session"}</small>
          <strong>{securityMode === "prototype" ? "Prototype" : authUser ? "JWT Authenticated" : "JWT Anonymous"}</strong>
          <span className="text-muted text-sm">
            {authUser ? `${authUser.username} · ${authUser.role}` : "로그인 전 상태"}
          </span>
          {isMockMode ? (
            <div className="stack-sm mt-xs">
              <button type="button" className="secondary-button" onClick={() => setRuntimeAuthPreset("prototype-admin")}>
                Prototype
              </button>
              <button type="button" className="secondary-button" onClick={() => setRuntimeAuthPreset("jwt-admin")}>
                JWT 관리자
              </button>
              <button type="button" className="secondary-button" onClick={() => setRuntimeAuthPreset("jwt-trainer")}>
                JWT 트레이너
              </button>
              <button type="button" className="secondary-button" onClick={clearRuntimeSession}>
                JWT 로그아웃 상태
              </button>
            </div>
          ) : (
            <div className="stack-sm mt-xs">
              <button type="button" className="secondary-button" onClick={() => void logout()}>
                로그아웃
              </button>
            </div>
          )}
          {authStatusMessage ? <span className="text-success text-xs">{authStatusMessage}</span> : null}
          {authError ? <span className="text-danger text-xs">{authError}</span> : null}
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
