import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { classNames } from '../lib/api';

const modules = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'donors', label: 'Donors', to: '/donors' },
  { key: 'collections', label: 'Collections', to: '/collections' },
  { key: 'inventory', label: 'Inventory', to: '/inventory' },
  { key: 'issuance', label: 'Issuance', to: '/issuance' },
  { key: 'reports', label: 'Reports', to: '/reports' },
  { key: 'finance', label: 'Finance', to: '/finance' },
  { key: 'barcodes', label: 'Barcodes', to: '/barcodes' },
  { key: 'backups', label: 'Backups', to: '/backups' },
  { key: 'logs', label: 'Audit Logs', to: '/logs' },
  { key: 'notifications', label: 'Notifications', to: '/notifications' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [financeOpen, setFinanceOpen] = useState(false);

  const financeActive = useMemo(() => location.pathname === '/finance', [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
      <div className="px-4 py-5 border-b border-slate-200">
        <div className="text-lg font-semibold text-slate-900">Blood Bank</div>
        <div className="text-xs text-slate-500 mt-1">{user?.username || 'User'}</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {modules.map((item) =>
          item.key === 'finance' ? (
            <div key={item.key} className="space-y-1">
              <button
                onClick={() => setFinanceOpen((o) => !o)}
                className={classNames(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  financeActive || financeOpen ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <span>{item.label}</span>
                <span className="text-xs">{financeOpen ? '▲' : '▼'}</span>
              </button>
              {financeOpen && (
                <div className="pl-3 space-y-1">
                  <NavLink
                    to={{ pathname: '/finance', search: '?section=pricing' }}
                    className={({ isActive }) =>
                      classNames(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                      )
                    }
                  >
                    Blood Unit Pricing
                  </NavLink>
                  <NavLink
                    to={{ pathname: '/finance', search: '?section=expenses' }}
                    className={({ isActive }) =>
                      classNames(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                      )
                    }
                  >
                    Expenses
                  </NavLink>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                )
              }
            >
              <span>{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white text-sm py-2 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div className="text-lg font-semibold text-slate-900 md:hidden">Blood Bank</div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-600 text-right">
          <div className="font-medium text-slate-800">{user?.full_name || user?.username}</div>
          <div className="text-xs text-slate-500">{user?.role || 'Staff'}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
          {(user?.full_name || user?.username || '?').slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export function Shell() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4 md:p-6 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
