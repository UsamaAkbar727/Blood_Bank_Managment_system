import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartHandshake, Package, FlaskConical, ArrowUpFromLine, 
  AlertTriangle, Droplets, Clock, ChevronRight, Sparkles 
} from 'lucide-react';
import { LineChart, DoughnutChart } from '../components/Charts';
import { StatCard, SectionCard, useScrollReveal } from '../components/UI';
import { formatNumber } from '../lib/api';
import { useApiResource } from '../lib/hooks';
import { useAuth } from '../components/AuthProvider';

function BloodDropIcon({ percent, status, id }) {
  const fillColor = status === 'out_of_stock'
    ? '#94a3b8' // Slate-400 for empty
    : status === 'low_stock'
      ? '#f59e0b' // Amber-500
      : '#e11d48'; // Rose-600

  const uniqueId = `drop-clip-${id.replace('+', 'plus').replace('-', 'minus')}`;

  return (
    <div className="relative flex items-center justify-center filter drop-shadow-sm select-none">
      <svg className="w-12 h-14 shrink-0 transition-all duration-300 animate-float" viewBox="0 0 24 28" fill="none">
        {/* Backing shape */}
        <path
          d="M12 26c-4.97 0-9-4.03-9-9 0-5.06 9-14 9-14s9 8.94 9 14c0 4.97-4.03 9-9 9z"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.2"
        />
        {/* Filled shape */}
        <g clipPath={`url(#${uniqueId})`}>
          <path
            d="M12 26c-4.97 0-9-4.03-9-9 0-5.06 9-14 9-14s9 8.94 9 14c0 4.97-4.03 9-9 9z"
            fill={fillColor}
          />
        </g>
        <defs>
          <clipPath id={uniqueId}>
            <rect x="0" y={26 - (percent / 100) * 23} width="24" height="28" />
          </clipPath>
        </defs>
      </svg>
      <span className="absolute text-[9px] font-black text-slate-800 bg-white/90 px-1 py-0.5 rounded shadow-sm border border-slate-100/50 mt-5">
        {percent}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  useScrollReveal();
  const { user } = useAuth();

  const donors = useApiResource('/api/donors/index.php', {
    initialData: [],
    interval: 15000,
    transform: (res) => res.data || res,
  });

  const inventorySummary = useApiResource('/api/inventory/index.php?action=summary', {
    initialData: [],
    interval: 12000,
    transform: (res) => res.data || [],
  });

  const collections = useApiResource('/api/collections/index.php', {
    initialData: [],
    interval: 12000,
    transform: (res) => res.data || [],
  });

  const issuance = useApiResource('/api/issuance/index.php', {
    initialData: [],
    interval: 12000,
    transform: (res) => res.data || [],
  });

  const reportData = useApiResource('/api/reports/index.php?days=30', {
    initialData: {},
    interval: 30000,
    transform: (res) => res || {},
  });

  const thresholdsData = useApiResource('/api/settings/thresholds.php', {
    initialData: { thresholds: {}, alerts: [] },
    interval: 15000,
    transform: (res) => res || { thresholds: {}, alerts: [] },
  });

  const lowStockAlerts = useMemo(() => thresholdsData.data?.alerts || [], [thresholdsData.data]);

  const stats = useMemo(() => {
    const totalDonors = donors.data.length;
    const totalUnits = (inventorySummary.data || []).reduce((sum, row) => sum + (row.available || 0), 0);
    const pendingScreen = collections.data.filter((c) => ['pending_screen', 'screening'].includes(c.status)).length;
    const today = new Date().toISOString().slice(0, 10);
    const issuanceToday = issuance.data.filter((i) => (i.issue_date || '').startsWith(today)).length;
    return { totalDonors, totalUnits, pendingScreen, issuanceToday };
  }, [donors.data, inventorySummary.data, collections.data, issuance.data]);

  const line = useMemo(() => {
    const labels = (reportData.data?.daily_collections || []).map((i) => i.day);
    const collected = (reportData.data?.daily_collections || []).map((i) => Number(i.total || 0));
    const issued = (reportData.data?.issuance_daily || []).map((i) => Number(i.total || 0));
    return { labels, collected, issued };
  }, [reportData.data]);

  const bloodMix = useMemo(() => {
    const donorsBg = reportData.data?.donor_blood_groups || [];
    return {
      labels: donorsBg.map((d) => d.blood_group || 'N/A'),
      values: donorsBg.map((d) => Number(d.total || 0)),
    };
  }, [reportData.data]);

  const bloodGroupStocks = useMemo(() => {
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const stockMap = {};
    groups.forEach((g) => {
      stockMap[g] = 0;
    });
    (inventorySummary.data || []).forEach((row) => {
      const bg = row.blood_group;
      if (groups.includes(bg)) {
        stockMap[bg] += Number(row.available || 0);
      }
    });
    return stockMap;
  }, [inventorySummary.data]);

  const thresholds = useMemo(() => {
    return thresholdsData.data?.thresholds || {};
  }, [thresholdsData.data]);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="space-y-6 page-stagger">
      
      {/* Premium Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl dashboard-gradient-card p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-pulse-soft" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-rose-300 text-[10px] font-bold tracking-wider uppercase">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 glow-dot-online"></span>
            </span>
            System Live Overview
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-rose-100 bg-clip-text text-transparent flex items-center gap-2">
            Welcome back, {user?.full_name || user?.username || 'Administrator'}!
            <Sparkles size={24} className="text-amber-300 animate-pulse-soft inline-block shrink-0" />
          </h1>
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            Monitor donor enrollments, blood stock metrics, screening pipelines, and patient issuances from your central bank command center.
          </p>
        </div>

        {/* Quick actions panel */}
        <div className="relative z-10 flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
          <Link
            to="/donors"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-rose-50 font-extrabold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg"
          >
            <HeartHandshake size={15} className="text-rose-600 shrink-0" />
            <span>Add Donor</span>
          </Link>
          <Link
            to="/collections"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/25 backdrop-blur-md text-white font-extrabold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg"
          >
            <Droplets size={15} className="text-rose-300 shrink-0" />
            <span>New Collection</span>
          </Link>
          <Link
            to="/issuance"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/25 backdrop-blur-md text-white font-extrabold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg"
          >
            <ArrowUpFromLine size={15} className="text-indigo-300 shrink-0" />
            <span>Issue Blood</span>
          </Link>
        </div>
      </div>

      {/* Critical Stock Alert Box */}
      {lowStockAlerts.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm border-l-4 border-l-red-600">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm border border-red-200/50">
            <AlertTriangle size={20} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-red-800 text-sm tracking-tight">Critical Stock Alert: Low Safety Thresholds</h4>
            <p className="text-xs text-red-600 mt-1 font-medium leading-relaxed">
              The following blood groups have fallen below their safety threshold requirements. Actions should be taken to run active donor campaigns.
            </p>
            <div className="flex flex-wrap gap-2.5 mt-3">
              {lowStockAlerts.map((alert) => (
                <span 
                  key={alert.blood_group} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold uppercase shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                  {alert.blood_group}: {alert.current_units} units <span className="text-red-400 font-medium">(min: {alert.min_units})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Active Donors" value={formatNumber(stats.totalDonors)} badge="live" tone="blue" icon={HeartHandshake} delay={0} />
        <StatCard title="Units In Inventory" value={formatNumber(stats.totalUnits)} badge="available" tone="green" icon={Package} delay={50} />
        <StatCard title="Pending Screening" value={formatNumber(stats.pendingScreen)} badge="action needed" tone="amber" icon={FlaskConical} delay={100} />
        <StatCard title="Issuances Today" value={formatNumber(stats.issuanceToday)} badge="today" tone="brand" icon={ArrowUpFromLine} delay={150} />
      </div>

      {/* Blood Stock Levels Progress Monitor */}
      <SectionCard 
        title="Live Blood Stock Levels Tracker" 
        action={
          <span className="badge-neutral font-bold uppercase text-[9px] tracking-wide px-2.5 py-1">Stock Safety Check</span>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-2">
          {bloodGroups.map((bg) => {
            const currentUnits = bloodGroupStocks[bg] || 0;
            const minUnits = thresholds[bg] || 5;
            const percent = minUnits > 0 ? Math.min(100, Math.round((currentUnits / minUnits) * 100)) : 100;
            
            let status = 'safe';
            if (currentUnits === 0) status = 'out_of_stock';
            else if (currentUnits < minUnits) status = 'low_stock';

            const cardStyles = status === 'out_of_stock'
              ? 'border-red-200 bg-red-50/15'
              : status === 'low_stock'
                ? 'border-amber-200 bg-amber-50/15'
                : 'border-slate-200 bg-white hover:border-brand-200';

            const nameColor = status === 'out_of_stock'
              ? 'text-red-700'
              : status === 'low_stock'
                ? 'text-amber-700'
                : 'text-slate-800';

            return (
              <div 
                key={bg} 
                className={`blood-drop-card border rounded-2xl p-4 flex flex-col items-center justify-between text-center gap-3 relative overflow-hidden ${cardStyles}`}
              >
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                  {status === 'out_of_stock' && (
                    <div className="w-12 h-4 bg-red-500 text-white text-[8px] font-extrabold rotate-45 flex items-center justify-center absolute right-[-14px] top-[4px] uppercase tracking-wider">Empty</div>
                  )}
                  {status === 'low_stock' && (
                    <div className="w-12 h-4 bg-amber-500 text-white text-[8px] font-extrabold rotate-45 flex items-center justify-center absolute right-[-14px] top-[4px] uppercase tracking-wider">Low</div>
                  )}
                </div>
                <div>
                  <h4 className={`text-xl font-black tracking-tight ${nameColor}`}>{bg}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Blood Group</p>
                </div>
                <BloodDropIcon percent={percent} status={status} id={bg} />
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 px-0.5">
                    <span>{currentUnits} Bags</span>
                    <span>Min: {minUnits}</span>
                  </div>
                  {/* Miniature progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        status === 'out_of_stock'
                          ? 'bg-slate-400'
                          : status === 'low_stock'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <SectionCard
          className="xl:col-span-2"
          title="Collection & Issuance Trends"
          action={
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Auto-refresh (30d)</span>
            </div>
          }
        >
          <div className="h-64 mt-2">
            <LineChart
              labels={line.labels}
              datasets={[
                {
                  label: 'Collected',
                  data: line.collected,
                  borderColor: '#e11d48',
                  backgroundColor: 'rgba(225,29,72,0.06)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  borderWidth: 2.5,
                },
                {
                  label: 'Issued',
                  data: line.issued,
                  borderColor: '#4f46e5',
                  backgroundColor: 'rgba(79,70,229,0.06)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  borderWidth: 2.5,
                },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard 
          title="Donor Blood Group Mix" 
          action={
            <span className="badge-neutral font-bold uppercase text-[9px] tracking-wide px-2.5 py-1">Donor Base</span>
          }
        >
          <div className="h-64 flex flex-col justify-center mt-2">
            <DoughnutChart labels={bloodMix.labels} values={bloodMix.values} />
          </div>
        </SectionCard>
      </div>

      {/* Actionable Tables / Feeds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Recent Blood Collections"
          action={
            <Link to="/collections" className="link-brand flex items-center gap-0.5 text-xs">
              View all collections <ChevronRight size={14} />
            </Link>
          }
        >
          <div className="divide-y divide-slate-100/70 -mx-1">
            {collections.data.slice(0, 5).map((row) => {
              const initials = (row.donor_name || 'Donor')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              
              return (
                <div key={row.id} className="py-3 flex items-center justify-between group hover:bg-slate-50/50 px-2 rounded-xl transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs border border-rose-100 shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-brand-600 transition-colors text-sm">
                        {row.collection_code}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {row.donor_name || 'Donor'} • <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">{row.blood_group}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-semibold">{row.collection_date}</div>
                    <span className={`inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      row.status === 'safe' || row.status === 'stored' 
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' 
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>
                      {row.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
            {collections.data.length === 0 && (
              <div className="text-sm text-slate-400 py-6 text-center">No collections recorded yet</div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Expired / Actionable Inventory"
          action={
            <Link to="/inventory" className="link-brand flex items-center gap-0.5 text-xs">
              Manage inventory <ChevronRight size={14} />
            </Link>
          }
        >
          <div className="divide-y divide-slate-100/70 -mx-1">
            {(reportData.data?.inventory_snapshot || [])
              .filter((r) => r.status === 'expired')
              .slice(0, 5)
              .map((row, idx) => (
                <div key={`${row.blood_group}-${idx}`} className="py-3 flex items-center justify-between group hover:bg-slate-50/50 px-2 rounded-xl transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm border border-red-100 shrink-0">
                      {row.blood_group}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Expired blood units alert</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                        <Clock size={12} className="text-red-400" />
                        Requires immediate disposal process
                      </div>
                    </div>
                  </div>
                  <span className="badge-danger font-bold uppercase text-[9px] tracking-wider px-2.5 py-1 shadow-sm">
                    {formatNumber(row.total)} units expired
                  </span>
                </div>
              ))}
            {(reportData.data?.inventory_snapshot || []).filter((r) => r.status === 'expired').length === 0 && (
              <div className="text-sm text-slate-400 py-6 text-center flex flex-col items-center justify-center gap-1">
                <span className="text-emerald-500 font-bold text-sm">✓ Safe Inventory</span>
                <span className="text-xs text-slate-400">All current units are within active shelf-life limits</span>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

    </div>
  );
}
