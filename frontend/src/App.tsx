import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import styles from "./App.module.css";

import { useAuthState } from "./app/auth";
import {
  canAccessShellRoute,
  getShellRouteByPath,
  getSidebarRoutes,
} from "./app/routes";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AccessPage from "./pages/access/AccessPage";
import CrmPage from "./pages/crm/CrmPage";
import LockersPage from "./pages/lockers/LockersPage";
import MembershipsPage from "./pages/memberships/MembershipsPage";
import ProductsPage from "./pages/products/ProductsPage";
import ReservationsPage from "./pages/reservations/ReservationsPage";
import SettlementsPage from "./pages/settlements/SettlementsPage";
import TrainerAvailabilityPage from "./pages/trainer-availability/TrainerAvailabilityPage";
import TrainersPage from "./pages/trainers/TrainersPage";
import MemberList from "./pages/members/MemberList";
import { SelectedMemberProvider } from "./pages/members/modules/SelectedMemberContext";

export default function App() {
  const location = useLocation();
  const { authBootstrapping, authUser, isMockMode, securityMode } = useAuthState();
  const shellRoute = getShellRouteByPath(location.pathname);
  const isJwt = securityMode === "jwt";
  const sidebarRoutes = getSidebarRoutes(authUser, isMockMode);

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

  if (shellRoute && !canAccessShellRoute(shellRoute, authUser, isMockMode)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SelectedMemberProvider>
      <Routes>
        <Route element={<DashboardLayout routes={sidebarRoutes} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<MemberList />} />
          <Route path="/my-schedule" element={<TrainerAvailabilityPage />} />
          <Route path="/trainers" element={<TrainersPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/access" element={<AccessPage />} />
          <Route path="/lockers" element={<LockersPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/products" element={<ProductsPage />} />
        </Route>
      </Routes>
    </SelectedMemberProvider>
  );
}

function BootstrappingScreen() {
  return (
    <main className={`centered-screen ${styles.bootstrappingScreen}`}>
      <div className={`panel-card ${styles.loadingCard}`}>
        <h1 className={`brand-title ${styles.loadingTitle}`}>System Initializing</h1>
        <p className={`text-muted text-sm ${styles.loadingText}`}>Establishing secure session and operation parameters...</p>
      </div>
    </main>
  );
}
