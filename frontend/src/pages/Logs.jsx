import React, { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../lib/api';
import Toast from '../components/Toast';

export default function Logs() {
  const [allRows, setAllRows] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const searchDebounce = useRef(null);
  const searchRef = useRef('');

  const load = async (q = '', { showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const res = await request(`/api/logs/index.php?q=${encodeURIComponent(q)}`);
      setAllRows(res.data || []);
    } catch (err) {
      setToast({ message: err.message || 'Unable to load logs.', type: 'error' });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return allRows;

    return allRows.filter((r) => {
      const username = (r.user_name || 'system').toLowerCase();
      const action = (r.action || '').toLowerCase();
      const entity = (r.entity_type || '').toLowerCase();
      const entityId = String(r.entity_id || '').toLowerCase();
      return (
        username.includes(normalized) ||
        action.includes(normalized) ||
        entity.includes(normalized) ||
        entityId.includes(normalized)
      );
    });
  }, [allRows, search]);

  useEffect(() => {
    load('', { showLoading: true });
    const id = setInterval(() => load(searchRef.current, { showLoading: false }), 12000);
    return () => clearInterval(id);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm) {
      return;
    }

    try {
      await request('/api/logs/index.php', {
        method: 'DELETE',
        body: { id },
      });
      setToast({ message: 'Log entry deleted successfully.', type: 'success' });
      load(search);
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete log entry.', type: 'error' });
    }
  };

  return (
    <div className="space-y-3">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold text-slate-900">Audit Logs</h3>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            searchRef.current = value;

            if (searchDebounce.current) {
              clearTimeout(searchDebounce.current);
            }

            // Debounce server-side search while showing local filtered rows immediately
            searchDebounce.current = window.setTimeout(() => {
              load(value, { showLoading: false });
            }, 150);
          }}
          placeholder="Filter by user/action/entity"
          className="border border-slate-200 rounded-lg px-3 py-2 w-full md:w-72"
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
                <th className="px-4 py-2 text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={7}>
                    Loading logs...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-4 py-2">{r.created_at}</td>
                    <td className="px-4 py-2">{r.user_name ?? 'system'}</td>
                    <td className="px-4 py-2">{r.action}</td>
                    <td className="px-4 py-2">{r.entity_type}</td>
                    <td className="px-4 py-2">{r.entity_id ?? ''}</td>
                    <td className="px-4 py-2">{r.ip_address ?? ''}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={7}>
                    No logs found
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
