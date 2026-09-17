import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import BottomNav from "./components/BottomNav";
import Login from "./pages/Login";
import Today from "./pages/Today";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Plan from "./pages/Plan";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Ordering from "./pages/Ordering";
import Approvals from "./pages/Approvals";

function RepShell() {
  const { user } = useAuth();
  const location = useLocation();
  const hideNav = location.pathname.startsWith("/order");
  const homePath = user?.role === "analyst" ? "/approvals" : "/today";
  return (
    <div className="min-h-screen bg-[#f4f7f2] pb-20">
      <Routes>
        <Route path="/today" element={<Today />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/order" element={<Ordering />} />
        <Route path="/order/:customerId" element={<Ordering />} />
        <Route path="*" element={<Navigate to={homePath} replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Ordering tab is customer-facing and reachable without a rep login (shared link / QR code).
  if (location.pathname.startsWith("/order")) {
    return (
      <Routes>
        <Route path="/order" element={<Ordering />} />
        <Route path="/order/:customerId" element={<Ordering />} />
      </Routes>
    );
  }

  if (!user) return <Login />;
  return <RepShell />;
}
