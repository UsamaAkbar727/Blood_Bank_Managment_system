import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import { DoughnutChart, LineChart } from '../components/Charts';
import { PageHeader, SectionCard, useScrollReveal } from '../components/UI';
import { request } from '../lib/api';

export default function Reports() {
  useScrollReveal();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  const load = useCallback(async (d = days) => {
    const res = await request(`/api/reports/index.php?days=${d}`);
    setData(res);
  }, [days]);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const donorChart = useMemo(() => {
    const donors = data?.donor_blood_groups || [];
    return { labels: donors.map((d) => d.blood_group || 'N/A'), values: donors.map((d) => d.total) };
  }, [data]);

  const collections = useMemo(() => {
    const items = data?.daily_collections || [];
    return {
      labels: items.map((i) => i.day),
      collected: items.map((i) => Number(i.total || 0)),
      issued: (data?.issuance_daily || []).map((i) => Number(i.total || 0)),
    };
  }, [data]);

  const screen = useMemo(() => data?.screening_results || [], [data]);
  const inventory = useMemo(() => data?.inventory_snapshot || [], [data]);

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader icon={BarChart3} title="Reports" subtitle="Analytics and operational insights">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="select-field w-full sm:w-auto"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Print
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Donors by Blood Group">
          <div className="h-72">
            <DoughnutChart labels={donorChart.labels} values={donorChart.values} height={280} />
          </div>
        </SectionCard>
        <SectionCard title="Collections vs Issuance (Daily)">
          <div className="h-72">
            <LineChart
              labels={collections.labels}
              datasets={[
                {
                  label: 'Collections',
                  data: collections.collected,
                  borderColor: '#e11d48',
                  backgroundColor: 'rgba(225,29,72,0.1)',
                  fill: true,
                  tension: 0.4,
                },
                {
                  label: 'Issuance',
                  data: collections.issued,
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  fill: true,
                  tension: 0.4,
                },
              ]}
              height={280}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Screening Results">
          <div className="space-y-2">
            {screen.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-700">{s.result_status}</span>
                <span className="font-bold text-slate-900">{s.total}</span>
              </div>
            ))}
            {screen.length === 0 && <div className="text-sm text-slate-400 py-4 text-center">No data</div>}
          </div>
        </SectionCard>
        <SectionCard title="Inventory Snapshot (by blood group)">
          <div className="space-y-2 text-sm">
            {inventory.map((inv, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="text-slate-700">{inv.blood_group} — {inv.status}</div>
                <span className="font-bold text-slate-900">{inv.total}</span>
              </div>
            ))}
            {inventory.length === 0 && <div className="text-sm text-slate-400 py-4 text-center">No snapshot data</div>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
