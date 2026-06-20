import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Package, FlaskConical, ArrowUpFromLine } from 'lucide-react';
import { LineChart, DoughnutChart } from '../components/Charts';
import { PageHeader, StatCard, SectionCard, useScrollReveal } from '../components/UI';
import { formatNumber } from '../lib/api';
import { useApiResource } from '../lib/hooks';

export default function Dashboard() {
  useScrollReveal();

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

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        icon={HeartHandshake}
        title="Dashboard"
        subtitle="Real-time overview of blood bank operations"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Active Donors" value={formatNumber(stats.totalDonors)} badge="live" tone="blue" icon={HeartHandshake} />
        <StatCard title="Units In Inventory" value={formatNumber(stats.totalUnits)} badge="available" tone="green" icon={Package} />
        <StatCard title="Pending Screening" value={formatNumber(stats.pendingScreen)} badge="action needed" tone="amber" icon={FlaskConical} />
        <StatCard title="Issuances Today" value={formatNumber(stats.issuanceToday)} badge="today" tone="brand" icon={ArrowUpFromLine} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          className="xl:col-span-2"
          title="Collection & Issuance (last 30 days)"
          action={<span className="badge-neutral">Auto-refresh</span>}
        >
          <div className="h-56">
            <LineChart
              labels={line.labels}
              datasets={[
                {
                  label: 'Collected',
                  data: line.collected,
                  borderColor: '#e11d48',
                  backgroundColor: 'rgba(225,29,72,0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 3,
                  pointHoverRadius: 6,
                },
                {
                  label: 'Issued',
                  data: line.issued,
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 3,
                  pointHoverRadius: 6,
                },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="Blood Group Mix" action={<span className="badge-neutral">Donor base</span>}>
          <DoughnutChart labels={bloodMix.labels} values={bloodMix.values} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Recent Collections"
          action={
            <Link to="/collections" className="link-brand">
              View all →
            </Link>
          }
        >
          <div className="divide-y divide-slate-100">
            {collections.data.slice(0, 5).map((row) => (
              <div key={row.id} className="py-3 text-sm flex items-center justify-between group">
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{row.collection_code}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{row.donor_name || 'Donor'} · {row.blood_group}</div>
                </div>
                <div className="text-xs text-slate-400 font-medium">{row.collection_date}</div>
              </div>
            ))}
            {collections.data.length === 0 && <div className="text-sm text-slate-400 py-4 text-center">No records</div>}
          </div>
        </SectionCard>

        <SectionCard
          title="Expiring Soon"
          action={
            <Link to="/inventory" className="link-brand">
              Manage →
            </Link>
          }
        >
          <div className="divide-y divide-slate-100">
            {(reportData.data?.inventory_snapshot || [])
              .filter((r) => r.status === 'expired')
              .slice(0, 6)
              .map((row, idx) => (
                <div key={`${row.blood_group}-${idx}`} className="py-3 text-sm flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{row.blood_group}</div>
                  <span className="badge-danger">{formatNumber(row.total)} expired</span>
                </div>
              ))}
            {(reportData.data?.inventory_snapshot || []).length === 0 && (
              <div className="text-sm text-slate-400 py-4 text-center">No expiring inventory</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
