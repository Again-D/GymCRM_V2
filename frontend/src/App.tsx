import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import styles from "./App.module.css";

import { useAuthState } from "./app/auth";
import { RouteProfiler } from "./app/reactProfiler";
import {
  canAccessShellRoute,
  getShellRouteByPath,
  getSidebarRoutes,
} from "./app/routes";
import { SelectedMemberProvider } from "./pages/members/modules/SelectedMemberContext";

const loadDashboardLayout = () => import("./components/layout/DashboardLayout");
const DashboardLayout = lazy(loadDashboardLayout);
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const AccessPage = lazy(() => import("./pages/access/AccessPage"));
const CrmPage = lazy(() => import("./pages/crm/CrmPage"));
const LockersPage = lazy(() => import("./pages/lockers/LockersPage"));
const MembershipsPage = lazy(() => import("./pages/memberships/MembershipsPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const ReservationsPage = lazy(() => import("./pages/reservations/ReservationsPage"));
const SettlementsPage = lazy(() => import("./pages/settlements/SettlementsPage"));
const AuditLogsPage = lazy(() => import("./pages/audit/AuditLogsPage"));
const GxSchedulesPage = lazy(() => import("./pages/gx-schedules/GxSchedulesPage"));
const TrainerAvailabilityPage = lazy(() => import("./pages/trainer-availability/TrainerAvailabilityPage"));
const TrainersPage = lazy(() => import("./pages/trainers/TrainersPage"));
const MemberList = lazy(() => import("./pages/members/MemberList"));

if (import.meta.env.MODE === "test") {
  void loadDashboardLayout();
  void import("./pages/Dashboard");
}

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
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route
            path="/login"
            element={
              <RouteProfiler id="Login">
                <Login />
              </RouteProfiler>
            }
          />
        </Routes>
      </Suspense>
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
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route element={<DashboardLayout routes={sidebarRoutes} />}>
            <Route
              path="/dashboard"
              element={
                <RouteProfiler id="Dashboard">
                  <Dashboard />
                </RouteProfiler>
              }
            />
            <Route
              path="/members"
              element={
                <RouteProfiler id="Members">
                  <MemberList />
                </RouteProfiler>
              }
            />
            <Route
              path="/my-schedule"
              element={
                <RouteProfiler id="TrainerAvailability">
                  <TrainerAvailabilityPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/gx-schedules"
              element={
                <RouteProfiler id="GxSchedules">
                  <GxSchedulesPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/trainers"
              element={
                <RouteProfiler id="Trainers">
                  <TrainersPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/memberships"
              element={
                <RouteProfiler id="Memberships">
                  <MembershipsPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/reservations"
              element={
                <RouteProfiler id="Reservations">
                  <ReservationsPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/access"
              element={
                <RouteProfiler id="Access">
                  <AccessPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/lockers"
              element={
                <RouteProfiler id="Lockers">
                  <LockersPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/crm"
              element={
                <RouteProfiler id="CRM">
                  <CrmPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/settlements"
              element={
                <RouteProfiler id="Settlements">
                  <SettlementsPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/audit"
              element={
                <RouteProfiler id="AuditLogs">
                  <AuditLogsPage />
                </RouteProfiler>
              }
            />
            <Route
              path="/products"
              element={
                <RouteProfiler id="Products">
                  <ProductsPage />
                </RouteProfiler>
              }
            />
          </Route>
        </Routes>
      </Suspense>
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

function RouteLoadingScreen() {
  return (
    <main className={`centered-screen ${styles.bootstrappingScreen}`}>
      <div className={`panel-card ${styles.loadingCard}`}>
        <h1 className={`brand-title ${styles.loadingTitle}`}>Loading Workspace</h1>
        <p className={`text-muted text-sm ${styles.loadingText}`}>
          Preparing the selected operation module...
        </p>
      </div>
    </main>
  );
}
