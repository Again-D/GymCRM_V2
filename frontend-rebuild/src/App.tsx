import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuthState } from "./app/auth";
import { getShellRouteByPath, shellRoutes } from "./app/routes";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MembershipsPage from "./pages/memberships/MembershipsPage";
import ReservationsPage from "./pages/reservations/ReservationsPage";
import ShellPlaceholderPage from "./pages/ShellPlaceholderPage";
import MemberList from "./pages/members/MemberList";
import { SelectedMemberProvider } from "./pages/members/modules/SelectedMemberContext";

export default function App() {
  const location = useLocation();
  const { authBootstrapping, authUser, securityMode } = useAuthState();
  const shellRoute = getShellRouteByPath(location.pathname);
  const isJwt = securityMode === "jwt";
  const sidebarRoutes = shellRoutes.filter((route) => route.showInSidebar);

  if (authBootstrapping) {
    return <BootstrappingScreen />;
  }

  if (location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  if (location.pathname === "/login") {
    if (!isJwt || authUser) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  if (!shellRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isJwt && !authUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SelectedMemberProvider>
      <Routes>
        <Route element={<DashboardLayout routes={sidebarRoutes} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<MemberList />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route
            path="/access"
            element={<ShellPlaceholderPage title="출입 관리 프로토타입" description="Access queries and current presence will be rebuilt after the core member-context flows." />}
          />
          <Route
            path="/lockers"
            element={<ShellPlaceholderPage title="라커 관리 프로토타입" description="Locker ownership and assignment flows are intentionally deferred." />}
          />
          <Route
            path="/crm"
            element={<ShellPlaceholderPage title="CRM 메시지 프로토타입" description="Messaging trigger and history flows will be rebuilt after core parity." />}
          />
          <Route
            path="/settlements"
            element={<ShellPlaceholderPage title="정산 리포트 프로토타입" description="Settlement query ownership and reporting will be added in a later phase." />}
          />
          <Route
            path="/products"
            element={<ShellPlaceholderPage title="상품 관리 프로토타입" description="Product pages remain outside the first vertical slice." />}
          />
        </Route>
      </Routes>
    </SelectedMemberProvider>
  );
}

function BootstrappingScreen() {
  return (
    <section style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <div>
        <h1>부트스트래핑 중</h1>
        <p>재구축 프로토타입이 인증 상태를 확인하는 동안 잠시 대기합니다.</p>
      </div>
    </section>
  );
}
