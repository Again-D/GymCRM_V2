import { Link, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MemberList from "./pages/members/MemberList";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members" element={<MemberList />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function PrototypeNav() {
  return (
    <nav>
      <Link to="/dashboard">대시보드</Link>
      <Link to="/members">회원 관리</Link>
    </nav>
  );
}
