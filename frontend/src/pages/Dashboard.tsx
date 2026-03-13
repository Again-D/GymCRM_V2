import { Link } from "react-router-dom";

import { shellRoutes } from "../app/routes";

const dashboardRoutes = shellRoutes.filter((route) => route.showInDashboard);

export default function Dashboard() {
  return (
    <section>
      <h1>재구축 프로토타입 대시보드</h1>
      <p>Phase 1 shell prototype baseline.</p>
      <div className="stack-md mt-lg">
        {dashboardRoutes.map((route) => (
          <Link key={route.key} to={route.path}>
            <strong>{route.label}</strong>
            <span className="display-block text-muted mt-xs">{route.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
