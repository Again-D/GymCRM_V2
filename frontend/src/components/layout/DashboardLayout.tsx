import { NavLink, Outlet } from "react-router-dom";

import { useAuthState } from "../../app/auth";
import type { ShellRoute } from "../../app/routes";
import HeaderLayout from "./HeaderLayout";

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
        <HeaderLayout>
           {/* Page Title or Breadcrumbs could go here */}
        </HeaderLayout>
        <div className={styles["app-shell__content"]}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
