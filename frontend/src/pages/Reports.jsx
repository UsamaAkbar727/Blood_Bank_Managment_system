import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DoughnutChart, LineChart } from '../components/Charts';
import { request } from '../lib/api';

export default function Reports() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [driveLink, setDriveLink] = useState(null);
  const [exportError, setExportError] = useState('');

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

  const exportReport = async (format) => {
    setExporting(true);
    setExportError('');
    setDriveLink(null);
    try {
      const payload = { format, days };
      const res = await request('/api/reports/drive-export.php', { method: 'POST', body: payload });
      
      if (res.data?.url) {
        setDriveLink({
          name: res.data.name,
          url: res.data.url,
          createdTime: res.data.createdTime,
        });
      }
    } catch (err) {
      setExportError(err.message || 'Failed to export report to Google Drive');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Reporting Dashboard</h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={() => exportReport('excel')}
          >
            {exporting ? '⏳ Uploading...' : '☁️ Save Excel to Drive'}
          </button>
          <button
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={() => exportReport('pdf')}
          >
            {exporting ? '⏳ Uploading...' : '☁️ Save PDF to Drive'}
          </button>
          <button className="border border-slate-200 px-3 py-2 rounded-lg text-sm" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {exportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <strong>Export Error:</strong> {exportError}
        </div>
      )}

      {driveLink && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong>✓ Report saved to Google Drive!</strong>
              <p className="text-sm mt-1">File: <code className="bg-white px-2 py-1 rounded">{driveLink.name}</code></p>
              <p className="text-xs mt-2">Created: {new Date(driveLink.createdTime).toLocaleString()}</p>
            </div>
            <a
              href={driveLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded text-sm whitespace-nowrap"
            >
              Open in Drive →
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-4 h-full">
          <h4 className="font-semibold text-slate-900 mb-2">Donors by Blood Group</h4>
          <div className="h-72">
            <DoughnutChart labels={donorChart.labels} values={donorChart.values} height={280} />
          </div>
        </div>
        <div className="card p-4 h-full">
          <h4 className="font-semibold text-slate-900 mb-2">Collections vs Issuance (Daily)</h4>
          <div className="h-72">
            <LineChart
              labels={collections.labels}
              datasets={[
                {
                  label: 'Collections',
                  data: collections.collected,
                  borderColor: '#0d6efd',
                  backgroundColor: 'rgba(13,110,253,0.15)',
                  fill: true,
                  tension: 0.3,
                },
                {
                  label: 'Issuance',
                  data: collections.issued,
                  borderColor: '#dc2626',
                  backgroundColor: 'rgba(220,38,38,0.15)',
                  fill: true,
                  tension: 0.3,
                },
              ]}
              height={280}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-4 h-full">
          <h4 className="font-semibold text-slate-900 mb-2">Screening Results</h4>
          <div className="space-y-2">
            {screen.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{s.result_status}</span>
                <span className="font-semibold text-slate-900">{s.total}</span>
              </div>
            ))}
            {screen.length === 0 && <div className="text-sm text-slate-500">No data</div>}
          </div>
        </div>
        <div className="card p-4 h-full">
          <h4 className="font-semibold text-slate-900 mb-2">Inventory Snapshot (by blood group)</h4>
          <div className="space-y-2 text-sm">
            {inventory.map((inv, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="text-slate-700">
                  {inv.blood_group} - {inv.status}
                </div>
                <div className="font-semibold text-slate-900">{inv.total}</div>
              </div>
            ))}
            {inventory.length === 0 && <div className="text-sm text-slate-500">No snapshot data</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
