import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader, StatCard, SectionCard, useScrollReveal } from '../components/UI';
import { formatNumber } from '../lib/api';
import { request } from '../lib/api';

export default function Inventory() {
  useScrollReveal();
  const [summary, setSummary] = useState([]);
  const [low, setLow] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [safeCollections, setSafeCollections] = useState(0);
  const [screeningCollections, setScreeningCollections] = useState(0);

  const loadSummary = async () => {
    const res = await request('/api/inventory/index.php?action=summary');
    setSummary(res.data || []);
  };
  const loadLow = async () => {
    const res = await request('/api/inventory/index.php?action=low');
    setLow(res.data || []);
  };
  const loadExpiring = async () => {
    const res = await request('/api/inventory/index.php?action=expiring&days=7');
    setExpiring(res.data || []);
  };
  const loadTable = async (q = search, s = status) => {
    const res = await request(`/api/inventory/index.php?q=${encodeURIComponent(q)}&status=${encodeURIComponent(s)}`);
    setRows(res.data || []);
  };

  const loadCollectionStats = async () => {
    try {
      const safeRes = await request('/api/collections/index.php?status=safe');
      const screeningRes = await request('/api/collections/index.php?status=screening');
      setSafeCollections((safeRes.data || []).length);
      setScreeningCollections((screeningRes.data || []).length);
    } catch (err) {
      setSafeCollections(0);
      setScreeningCollections(0);
    }
  };

  useEffect(() => {
    loadSummary();
    loadLow();
    loadExpiring();
    loadTable();
    loadCollectionStats();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadSummary();
      loadLow();
      loadExpiring();
      loadTable(search, status);
    }, 12000);
    return () => clearInterval(id);
  }, [search, status]);

  const totalAvailable = summary.reduce((s, r) => s + (r.available || 0), 0);

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader icon={Package} title="Inventory" subtitle="Track blood units, expiry dates, and stock levels" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Available Units" value={formatNumber(totalAvailable)} badge="all groups" tone="green" icon={Package} />
        <StatCard title="Expiring ≤ 7 days" value={formatNumber(expiring.length)} badge="FIFO priority" tone="amber" icon={Clock} />
        <StatCard title="Low Stock Alerts" value={formatNumber(low.length)} badge="below threshold" tone="red" icon={AlertTriangle} />
      </div>

      <div className="page-header no-animate">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadTable(e.target.value, status);
            }}
            placeholder="Search by code, donor, blood, component"
            className="input-field w-full md:w-72"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              loadTable(search, e.target.value);
            }}
            className="select-field w-full sm:w-auto"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="issued">Issued</option>
            <option value="expired">Expired</option>
            <option value="discarded">Discarded</option>
          </select>
        </div>
        <span className="badge-neutral">FIFO: ordered by soonest expiry</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard className="lg:col-span-2 p-0 overflow-hidden" title="Blood Units">
          <div className="table-responsive overflow-x-auto -mx-5 -mb-5">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Component</th>
                  <th>Blood</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Donor</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold text-slate-800">{row.collection_code}</td>
                    <td>{row.component}</td>
                    <td><span className="badge-brand">{row.blood_group}</span></td>
                    <td>{row.expiry_date}</td>
                    <td>
                      <span className="badge-neutral">{row.status}</span>
                    </td>
                    <td>{row.donor_name || ''}</td>
                    <td>{row.volume_ml || ''} ml</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="text-slate-400 text-center py-6" colSpan={7}>
                      No inventory found.
                      {safeCollections > 0 && (
                        <span className="ml-2 text-amber-600">
                          {safeCollections} safe collection(s) exist but inventory is not yet generated in this view.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Low Stock">
            <div className="divide-y divide-slate-100">
              {low.map((row, idx) => (
                <div key={`${row.blood_group}-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{row.blood_group} {row.component}</span>
                  <span className="badge-danger">{row.units}</span>
                </div>
              ))}
              {low.length === 0 && <div className="text-sm text-slate-400 py-2">No low stock alerts</div>}
            </div>
          </SectionCard>
          <SectionCard title="Expiring Soon">
            <div className="divide-y divide-slate-100">
              {expiring.slice(0, 8).map((row, idx) => (
                <div key={`${row.collection_code}-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{row.collection_code}</div>
                    <div className="text-xs text-slate-500">{row.blood_group}</div>
                  </div>
                  <span className="badge-warning text-xs">{row.expiry_date}</span>
                </div>
              ))}
              {expiring.length === 0 && <div className="text-sm text-slate-400 py-2">No expiring units</div>}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
