import React, { useEffect, useState } from 'react';
import { formatNumber } from '../lib/api';
import { request } from '../lib/api';

export default function Inventory() {
  const [summary, setSummary] = useState([]);
  const [low, setLow] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

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

  useEffect(() => {
    loadSummary();
    loadLow();
    loadExpiring();
    loadTable();
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Available Units</div>
          <div className="text-4xl font-semibold text-slate-900">
            {formatNumber(summary.reduce((s, r) => s + (r.available || 0), 0))}
          </div>
          <div className="text-xs text-slate-500">All groups/components</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Expiring ≤ 7 days</div>
          <div className="text-4xl font-semibold text-amber-600">{formatNumber(expiring.length)}</div>
          <div className="text-xs text-slate-500">Prioritize FIFO</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Low Stock Alerts</div>
          <div className="text-4xl font-semibold text-red-600">{formatNumber(low.length)}</div>
          <div className="text-xs text-slate-500">Below threshold</div>
        </div>
      </div>

      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadTable(e.target.value, status);
            }}
            placeholder="Search by code, donor, blood, component"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 w-72"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              loadTable(search, e.target.value);
            }}
            className="border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="issued">Issued</option>
            <option value="expired">Expired</option>
            <option value="discarded">Discarded</option>
          </select>
        </div>
        <div className="text-xs text-slate-500">FIFO: ordered by soonest expiry</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="table-responsive overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Component</th>
                  <th className="px-4 py-2">Blood</th>
                  <th className="px-4 py-2">Expiry</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Donor</th>
                  <th className="px-4 py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{row.collection_code}</td>
                    <td className="px-4 py-2">{row.component}</td>
                    <td className="px-4 py-2">{row.blood_group}</td>
                    <td className="px-4 py-2">{row.expiry_date}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">{row.status}</span>
                    </td>
                    <td className="px-4 py-2">{row.donor_name || ''}</td>
                    <td className="px-4 py-2">{row.volume_ml || ''} ml</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-slate-500" colSpan={7}>
                      No inventory found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <h4 className="font-semibold text-slate-900 mb-2">Low Stock</h4>
            <div className="divide-y divide-slate-100">
              {low.map((row, idx) => (
                <div key={`${row.blood_group}-${idx}`} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    {row.blood_group} {row.component}
                  </span>
                  <span className="text-red-600 font-semibold">{row.units}</span>
                </div>
              ))}
              {low.length === 0 && <div className="text-sm text-slate-500 py-2">No low stock alerts</div>}
            </div>
          </div>
          <div className="card p-4">
            <h4 className="font-semibold text-slate-900 mb-2">Expiring Soon</h4>
            <div className="divide-y divide-slate-100">
              {expiring.slice(0, 8).map((row, idx) => (
                <div key={`${row.collection_code}-${idx}`} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-800">{row.collection_code}</div>
                    <div className="text-xs text-slate-500">{row.blood_group}</div>
                  </div>
                  <span className="text-amber-600 text-xs">{row.expiry_date}</span>
                </div>
              ))}
              {expiring.length === 0 && <div className="text-sm text-slate-500 py-2">No expiring units</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
