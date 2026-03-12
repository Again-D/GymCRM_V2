import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "대시보드" },
  { path: "/members", label: "회원 관리" }
];

export default function DashboardLayout() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ padding: 24, borderRight: "1px solid rgba(22, 33, 38, 0.12)" }}>
        <strong style={{ display: "block", marginBottom: 16 }}>GymCRM Rebuild</strong>
        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                padding: "12px 14px",
                borderRadius: 12,
                background: isActive ? "#162126" : "transparent",
                color: isActive ? "#f8f4ea" : "#162126"
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
