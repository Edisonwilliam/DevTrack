import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Invoices from "./pages/Invoice";
import PublicInvoice from "./pages/PublicInvoice";
import Payments from "./pages/Payments";
import PaymentCallback from "./pages/PaymentCallback";
import Admin from "./pages/Admin";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* =========================
              PUBLIC ROUTES
          ========================= */}

          <Route path="/" element={<Login />} />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* Public Client Invoice */}
          <Route
            path="/invoice/:token"
            element={<PublicInvoice />}
          />

          {/* Paystack Callback */}
          <Route
            path="/payment/callback"
            element={<PaymentCallback />}
          />

          {/* =========================
              PROTECTED DASHBOARD ROUTES
          ========================= */}

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/clients"
              element={<Clients />}
            />

            <Route
              path="/projects"
              element={<Projects />}
            />

            <Route
              path="/tasks"
              element={<Tasks />}
            />

            <Route
              path="/invoices"
              element={<Invoices />}
            />

            <Route
              path="/payments"
              element={<Payments />}
            />

            {/* Admin Only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;