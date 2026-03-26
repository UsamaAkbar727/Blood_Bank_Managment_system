import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Layout';
import { useAuth } from './components/AuthProvider';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Donors from './pages/Donors';
import Patients from './pages/Patients';
import Collections from './pages/Collections';
import Inventory from './pages/Inventory';
import Issuance from './pages/Issuance';
import Finance from './pages/Finance';
import Barcodes from './pages/Barcodes';
import Backups from './pages/Backups';
import Screening from './pages/Screening';
import Reports from './pages/Reports';
import Logs from './pages/Logs';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Checking session…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/donors" element={<Donors />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/screening" element={<Screening />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/issuance" element={<Issuance />} />
        <Route path="/finance" element={<Navigate to="/finance/blood-unit-pricing" replace />} />
        <Route path="/finance/blood-unit-pricing" element={<Finance section="pricing" />} />
        <Route path="/finance/expense" element={<Finance section="expenses" />} />
        <Route path="/barcodes" element={<Barcodes />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
