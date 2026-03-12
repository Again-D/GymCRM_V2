import { NavLink, Outlet } from "react-router-dom";

import { useAuthState } from "../../app/auth";
import type { ShellRoute } from "../../app/routes";

export default function DashboardLayout({ routes }: { routes: ShellRoute[] }) {
  const { authUser, clearRuntimeSession, securityMode, setRuntimeAuthPreset } = useAuthState();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ padding: 24, borderRight: "1px solid rgba(22, 33, 38, 0.12)" }}>
        <strong style={{ display: "block", marginBottom: 16 }}>GymCRM Rebuild</strong>
        <div style={{ display: "grid", gap: 8, marginBottom: 20, padding: 12, borderRadius: 12, background: "rgba(22, 33, 38, 0.05)" }}>
          <small style={{ color: "#4a6169" }}>Runtime Auth</small>
          <strong>{securityMode === "prototype" ? "Prototype" : authUser ? "JWT Authenticated" : "JWT Anonymous"}</strong>
          <span style={{ color: "#4a6169", fontSize: 14 }}>
            {authUser ? `${authUser.username} · ${authUser.role}` : "로그인 전 상태"}
          </span>
          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
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
        </div>
        <nav style={{ display: "grid", gap: 8 }}>
          {routes.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                padding: "12px 14px",
                borderRadius: 12,
                background: isActive ? "#162126" : "transparent",
                color: isActive ? "#f8f4ea" : "#162126",
                textDecoration: "none"
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ padding: 32 }}>
        <Outlet />
      </main>
    </div>
  );
}
