import React, { useEffect, useState } from 'react';
import { request } from '../lib/api';

export default function Logs() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const load = async (q = '') => {
    const res = await request(`/api/logs/index.php?q=${encodeURIComponent(q)}`);
    setRows(res.data || []);
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(search), 12000);
    return () => clearInterval(id);
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="card p-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Audit Logs</h3>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
          placeholder="Filter by action/entity"
          className="border border-slate-200 rounded-lg px-3 py-2 w-72"
        />
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Entity ID</th>
                <th className="px-4 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.created_at}</td>
                  <td className="px-4 py-2">{r.user_name ?? 'system'}</td>
                  <td className="px-4 py-2">{r.action}</td>
                  <td className="px-4 py-2">{r.entity_type}</td>
                  <td className="px-4 py-2">{r.entity_id ?? ''}</td>
                  <td className="px-4 py-2">{r.ip_address ?? ''}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={6}>
                    No log entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
