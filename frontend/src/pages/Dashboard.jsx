import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, DoughnutChart } from '../components/Charts';
import { formatNumber } from '../lib/api';
import { useApiResource } from '../lib/hooks';

function StatCard({ title, value, badge, tone = 'blue' }) {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-green-50 text-green-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-800',
  };
  return (
    <div className="card p-4 h-full">
      <p className="text-sm text-slate-500">{title}</p>
      <div className="flex items-center justify-between mt-1">
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
        {badge && <span className={`text-xs px-2 py-1 rounded-full ${toneMap[tone] || toneMap.blue}`}>{badge}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title="Active Donors" value={formatNumber(stats.totalDonors)} badge="live" tone="blue" />
        <StatCard title="Units In Inventory" value={formatNumber(stats.totalUnits)} badge="available" tone="green" />
        <StatCard title="Pending Screening" value={formatNumber(stats.pendingScreen)} badge="action" tone="amber" />
        <StatCard title="Issuances Today" value={formatNumber(stats.issuanceToday)} badge="today" tone="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="card p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800">Collection & Issuance (last 30 days)</h3>
            <span className="text-xs text-slate-500">Auto-refresh</span>
          </div>
          <div className="h-56">
            <LineChart
              labels={line.labels}
              datasets={[
                {
                  label: 'Collected',
                  data: line.collected,
                  borderColor: '#2563eb',
                  backgroundColor: 'rgba(37,99,235,0.12)',
                  tension: 0.35,
                  fill: true,
                },
                {
                  label: 'Issued',
                  data: line.issued,
                  borderColor: '#dc2626',
                  backgroundColor: 'rgba(220,38,38,0.12)',
                  tension: 0.35,
                  fill: true,
                },
              ]}
            />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800">Blood Group Mix</h3>
            <span className="text-xs text-slate-500">Donor base</span>
          </div>
          <DoughnutChart labels={bloodMix.labels} values={bloodMix.values} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800">Recent Collections</h3>
            <Link to="/collections" className="text-sm text-blue-600 hover:underline">
              Open
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {collections.data.slice(0, 5).map((row) => (
              <div key={row.id} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{row.collection_code}</div>
                  <div className="text-xs text-slate-500">{row.donor_name || 'Donor'} • {row.blood_group}</div>
                </div>
                <div className="text-xs text-slate-500">{row.collection_date}</div>
              </div>
            ))}
            {collections.data.length === 0 && <div className="text-sm text-slate-500 py-2">No records</div>}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800">Expiring Soon</h3>
            <Link to="/inventory" className="text-sm text-blue-600 hover:underline">
              Manage
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(reportData.data?.inventory_snapshot || [])
              .filter((r) => r.status === 'expired')
              .slice(0, 6)
              .map((row, idx) => (
                <div key={`${row.blood_group}-${idx}`} className="py-2 text-sm flex items-center justify-between">
                  <div className="font-medium text-slate-800">{row.blood_group}</div>
                  <div className="text-xs text-slate-500">{formatNumber(row.total)} expired</div>
                </div>
              ))}
            {(reportData.data?.inventory_snapshot || []).length === 0 && (
              <div className="text-sm text-slate-500 py-2">No expiring inventory</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
