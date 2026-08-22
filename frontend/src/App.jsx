import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InventoryPage from "./pages/InventoryPage";
import BusinessListingsPage from "./pages/BusinessListingsPage";
import BrowseListingsPage from "./pages/BrowseListingsPage";
import MyPickupsPage from "./pages/MyPickupsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-forest-800/50">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "business" ? "/dashboard/inventory" : "/dashboard/browse"} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard/inventory" element={<Protected role="business"><InventoryPage /></Protected>} />
      <Route path="/dashboard/listings" element={<Protected role="business"><BusinessListingsPage /></Protected>} />

      <Route path="/dashboard/browse" element={<Protected role="ngo"><BrowseListingsPage /></Protected>} />
      <Route path="/dashboard/pickups" element={<Protected role="ngo"><MyPickupsPage /></Protected>} />

      <Route path="/dashboard/analytics" element={<Protected><AnalyticsPage /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
