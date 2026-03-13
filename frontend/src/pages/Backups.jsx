import React, { useEffect, useState } from 'react';
import { request } from '../lib/api';
import Toast from '../components/Toast';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function pathRelative(fullPath) {
  const idx = fullPath.indexOf('backups');
  return idx >= 0 ? '/' + fullPath.substring(idx).replace(/\\\\/g, '/').replace(/\\/g, '/') : '#';
}

export default function Backups() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [format, setFormat] = useState('excel');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = async () => {
    const res = await request('/api/backups/index.php');
    setRows(res.data || []);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const backupNow = async () => {
    setRunning(true);
    setMessage('Running backup...');
    try {
      const res = await request(`/api/backups/index.php?format=${encodeURIComponent(format)}`, { method: 'POST' });
      setMessage(res.data?.status === 'success' ? 'Backup completed successfully.' : 'Backup failed. Please try again.');
      setToast({ message: res.data?.status === 'success' ? 'Backup completed successfully.' : 'Backup failed. Please try again.', type: res.data?.status === 'success' ? 'success' : 'error' });
      load();
    } catch (err) {
      setMessage(err.message || 'Backup failed. Please try again.');
      setToast({ message: err.message || 'Backup failed. Please try again.', type: 'error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Automatic Daily Backups</h3>
          <p className="text-sm text-slate-500">Retention: last 3 days. Exports PDF/Excel; optional Google Drive upload.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            onClick={backupNow}
            disabled={running}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {running ? 'Backing upâ€¦' : 'Backup Now'}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-slate-900">Recent Backups</h4>
          <span className="text-xs text-slate-500">Most recent first</span>
        </div>
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Drive</th>
                <th className="px-4 py-2">Download</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-4 py-2">{row.created_at}</td>
                  <td className="px-4 py-2">{row.file_name}</td>
                  <td className="px-4 py-2">{formatSize(row.file_size_bytes)}</td>
                  <td className="px-4 py-2">{row.status}</td>
                  <td className="px-4 py-2">{row.uploaded_to_drive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    {row.status === 'success' ? (
                      <a className="text-blue-600 text-sm" href={pathRelative(row.file_path)} download>
                        Download
                      </a>
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={6}>
                    No backups found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {message && <div className="text-sm text-slate-600 mt-2">{message}</div>}
      </div>
    </div>
  );
}
