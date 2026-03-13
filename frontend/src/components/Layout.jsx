import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { classNames } from '../lib/api';

function Icon({ children, className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const modules = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <Icon>
        <path d="M3 13.5 12 4l9 9.5" />
        <path d="M5 10.5V20h14v-9.5" />
        <path d="M9.5 20v-5h5v5" />
      </Icon>
    ),
  },
  {
    key: 'donors',
    label: 'Donors',
    to: '/donors',
    icon: (
      <Icon>
        <path d="M12 21s-6-4.35-6-10a3.5 3.5 0 0 1 6-2.3A3.5 3.5 0 0 1 18 11c0 5.65-6 10-6 10Z" />
      </Icon>
    ),
  },
  {
    key: 'collections',
    label: 'Collections',
    to: '/collections',
    icon: (
      <Icon>
        <path d="M12 3v10" />
        <path d="M8.5 9.5 12 13l3.5-3.5" />
        <path d="M6 15.5h12" />
        <path d="M8 19h8" />
      </Icon>
    ),
  },
  {
    key: 'screening',
    label: 'Screening',
    to: '/screening',
    icon: (
      <Icon>
        <path d="M9 3h6" />
        <path d="M10 3v5.5L5.5 16a4 4 0 0 0 3.5 5.5h6a4 4 0 0 0 3.5-5.5L14 8.5V3" />
        <path d="M8 14h8" />
      </Icon>
    ),
  },
  {
    key: 'inventory',
    label: 'Inventory',
    to: '/inventory',
    icon: (
      <Icon>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h3" />
      </Icon>
    ),
  },
  {
    key: 'issuance',
    label: 'Issuance',
    to: '/issuance',
    icon: (
      <Icon>
        <path d="M12 21V11" />
        <path d="m8.5 14.5 3.5-3.5 3.5 3.5" />
        <path d="M6 8.5h12" />
        <path d="M8 5h8" />
      </Icon>
    ),
  },
  {
    key: 'reports',
    label: 'Reports',
    to: '/reports',
    icon: (
      <Icon>
        <path d="M6 19V9" />
        <path d="M12 19V5" />
        <path d="M18 19v-7" />
      </Icon>
    ),
  },
  {
    key: 'finance',
    label: 'Finance',
    to: '/finance',
    icon: (
      <Icon>
        <path d="M12 3v18" />
        <path d="M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 3 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" />
      </Icon>
    ),
  },
  {
    key: 'barcodes',
    label: 'Barcodes',
    to: '/barcodes',
    icon: (
      <Icon>
        <path d="M5 6v12" />
        <path d="M8 6v12" />
        <path d="M11 6v12" />
        <path d="M14.5 6v12" />
        <path d="M17 6v12" />
        <path d="M19 6v12" />
      </Icon>
    ),
  },
  {
    key: 'backups',
    label: 'Backups',
    to: '/backups',
    icon: (
      <Icon>
        <path d="M20 16.5A3.5 3.5 0 0 0 17 11h-1a5 5 0 1 0-9.3 2.5A3.5 3.5 0 0 0 7.5 20H17" />
        <path d="M12 12v7" />
        <path d="m9.5 14.5 2.5-2.5 2.5 2.5" />
      </Icon>
    ),
  },
  {
    key: 'logs',
    label: 'Audit Logs',
    to: '/logs',
    icon: (
      <Icon>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </Icon>
    ),
  },
  {
    key: 'notifications',
    label: 'Notifications',
    to: '/notifications',
    icon: (
      <Icon>
        <path d="M6 16h12" />
        <path d="M8 16V11a4 4 0 1 1 8 0v5" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </Icon>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1V9c0 .4.2.8.6.9h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
      </Icon>
    ),
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [financeOpen, setFinanceOpen] = useState(false);

  const financeActive = useMemo(() => location.pathname.startsWith('/finance'), [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/finance')) {
      setFinanceOpen(true);
    }
  }, [location.pathname]);

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
                onClick={() => setFinanceOpen((open) => !open)}
                className={classNames(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  financeActive || financeOpen ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={classNames('w-4 h-4 shrink-0 transition-transform', financeOpen ? 'rotate-180' : '')}
                  aria-hidden="true"
                >
                  <path d="m5 7.5 5 5 5-5" />
                </svg>
              </button>
              {financeOpen && (
                <div className="pl-3 space-y-1">
                  <NavLink
                    to="/finance/blood-unit-pricing"
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
                    to="/finance/expense"
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
              <span className="shrink-0">{item.icon}</span>
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
