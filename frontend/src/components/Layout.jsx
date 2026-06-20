import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, HeartHandshake, UserRound, Droplets, FlaskConical,
  Package, ArrowUpFromLine, BarChart3, CircleDollarSign, Barcode,
  CloudUpload, ScrollText, Bell, Settings, LogOut, Menu, X, ChevronDown,
  Droplet,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { classNames } from '../lib/api';

const modules = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { key: 'donors', label: 'Donors', to: '/donors', icon: HeartHandshake },
  { key: 'patients', label: 'Patients', to: '/patients', icon: UserRound },
  { key: 'collections', label: 'Collections', to: '/collections', icon: Droplets },
  { key: 'screening', label: 'Screening', to: '/screening', icon: FlaskConical },
  { key: 'inventory', label: 'Inventory', to: '/inventory', icon: Package },
  { key: 'issuance', label: 'Issuance', to: '/issuance', icon: ArrowUpFromLine },
  { key: 'reports', label: 'Reports', to: '/reports', icon: BarChart3 },
  { key: 'finance', label: 'Finance', to: '/finance', icon: CircleDollarSign },
  { key: 'barcodes', label: 'Barcodes', to: '/barcodes', icon: Barcode },
  { key: 'backups', label: 'Backups', to: '/backups', icon: CloudUpload },
  { key: 'logs', label: 'Audit Logs', to: '/logs', icon: ScrollText },
  { key: 'notifications', label: 'Notifications', to: '/notifications', icon: Bell },
  { key: 'settings', label: 'Settings', to: '/settings', icon: Settings },
];

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item-inactive')}
    >
      <Icon size={18} strokeWidth={2} className="shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function FinanceNav({ financeOpen, setFinanceOpen, financeActive, onClose }) {
  const Icon = CircleDollarSign;
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setFinanceOpen((open) => !open)}
        className={classNames(
          'w-full flex items-center',
          financeActive || financeOpen ? 'nav-item-active' : 'nav-item-inactive',
          'justify-between',
        )}
      >
        <span className="flex items-center gap-3">
          <Icon size={18} strokeWidth={2} className="shrink-0" />
          <span>Finance</span>
        </span>
        <ChevronDown
          size={16}
          className={classNames('shrink-0 transition-transform duration-300', financeOpen ? 'rotate-180' : '')}
        />
      </button>
      <div
        className={classNames(
          'overflow-hidden transition-all duration-300 ease-out',
          financeOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="pl-4 ml-2 border-l border-white/10 space-y-0.5 pt-1">
          <NavLink
            to="/finance/blood-unit-pricing"
            onClick={onClose}
            className={({ isActive }) =>
              classNames(
                'block px-3 py-2 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'text-white bg-white/15 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/10',
              )
            }
          >
            Blood Unit Pricing
          </NavLink>
          <NavLink
            to="/finance/expense"
            onClick={onClose}
            className={({ isActive }) =>
              classNames(
                'block px-3 py-2 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'text-white bg-white/15 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/10',
              )
            }
          >
            Expenses
          </NavLink>
        </div>
      </div>
    </div>
  );
}

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
    <aside className="hidden md:flex fixed left-0 top-0 w-64 h-screen flex-col bg-sidebar-gradient shadow-sidebar z-20 border-r border-white/5">
      <div className="px-5 py-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand">
            <Droplet size={20} className="text-white" fill="currentColor" strokeWidth={0} />
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-tight">Blood Bank</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">{user?.username || 'User'}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
        {modules.map((item) =>
          item.key === 'finance' ? (
            <FinanceNav
              key={item.key}
              financeOpen={financeOpen}
              setFinanceOpen={setFinanceOpen}
              financeActive={financeActive}
            />
          ) : (
            <NavItem key={item.key} item={item} />
          ),
        )}
      </nav>

      <div className="p-3 pb-5 border-t border-white/10 mt-auto flex-shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-300 text-sm py-2.5 rounded-xl transition-all duration-200 font-medium border border-white/10 hover:border-red-500/30"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ open, onClose }) {
  const location = useLocation();
  const [financeOpen, setFinanceOpen] = useState(false);

  const financeActive = useMemo(() => location.pathname.startsWith('/finance'), [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/finance')) {
      setFinanceOpen(true);
    }
  }, [location.pathname]);

  return (
    <div className={classNames('fixed inset-0 z-30 md:hidden', open ? '' : 'pointer-events-none')}>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={classNames(
          'absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={classNames(
          'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-sidebar-gradient shadow-sidebar border-r border-white/5 transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Droplet size={18} className="text-white" fill="currentColor" strokeWidth={0} />
            </div>
            <div className="text-base font-bold text-white">Blood Bank</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-0.5 overflow-y-auto h-[calc(100%-80px)]">
          {modules.map((item) =>
            item.key === 'finance' ? (
              <FinanceNav
                key={item.key}
                financeOpen={financeOpen}
                setFinanceOpen={setFinanceOpen}
                financeActive={financeActive}
                onClose={onClose}
              />
            ) : (
              <NavItem key={item.key} item={item} onClick={onClose} />
            ),
          )}
        </nav>
      </div>
    </div>
  );
}

function TopBar({ onMenu }) {
  const { user } = useAuth();
  const initials = (user?.full_name || user?.username || '?').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 bg-white/100 backdrop-blur-xl border-b border-slate-200/80 px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="md:hidden btn-icon"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Droplet size={14} className="text-white" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="text-base font-bold text-slate-900">Blood Bank</span>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="text-sm text-right hidden sm:block">
          <div className="font-semibold text-slate-800">{user?.full_name || user?.username}</div>
          <div className="text-xs text-slate-500">{user?.role || 'Staff'}</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm ring-2 ring-brand-200/50 shadow-sm">
          {initials}
        </div>
      </div>
    </header>
  );
}

export function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-mesh">
      <Sidebar />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 md:ml-64 h-screen overflow-y-auto">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="p-4 md:p-6 space-y-5 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
