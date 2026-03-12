import { Link } from "react-router-dom";

import { shellRoutes } from "../app/routes";

const dashboardRoutes = shellRoutes.filter((route) => route.showInDashboard);

export default function Dashboard() {
  return (
    <section>
      <h1>재구축 프로토타입 대시보드</h1>
      <p>Phase 1 shell prototype baseline.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {dashboardRoutes.map((route) => (
          <Link key={route.key} to={route.path} style={{ color: "#162126" }}>
            <strong>{route.label}</strong>
            <span style={{ display: "block", color: "#4a6169", marginTop: 4 }}>{route.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
