import React, { useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { request, classNames } from '../lib/api';
import Toast from '../components/Toast';
import { PageHeader, SectionCard, useScrollReveal } from '../components/UI';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export default function Backups() {
  useScrollReveal();
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveError, setDriveError] = useState('');

  const load = async () => {
    const res = await request('/api/backups/index.php');
    setRows(res.data || []);
  };

  const loadDriveStatus = async () => {
    setDriveLoading(true);
    setDriveError('');
    try {
      const res = await request('/api/reports/drive-status.php');
      setDriveStatus(res);
    } catch (err) {
      setDriveError(err.message || 'Failed to load Google Drive status.');
    } finally {
      setDriveLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadDriveStatus();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const backupNow = async () => {
    setRunning(true);
    setMessage('Running backup...');
    try {
      const res = await request('/api/backups/index.php', { method: 'POST' });
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

  const driveConnected = Boolean(driveStatus?.status?.authenticated && driveStatus?.status?.token_valid && driveStatus?.status?.folder_id_configured);

  const connectDrive = () => {
    const authUrl = driveStatus?.auth_url;
    if (authUrl) {
      window.open(authUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setToast({
      message: driveConnected ? 'Google Drive is already connected.' : 'Google Drive is not ready yet. Check Settings for setup details.',
      type: driveConnected ? 'success' : 'warning',
    });
  };

  return (
    <div className="space-y-5 page-stagger">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <PageHeader icon={CloudUpload} title="Backups" subtitle="Automatic daily backups - retention: latest 3 kept">
        <button
            type="button"
            onClick={connectDrive}
            disabled={driveLoading}
            className={classNames(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              driveConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              driveLoading && 'cursor-not-allowed opacity-60',
            )}
            title={driveConnected ? 'Google Drive is connected' : 'Connect Google Drive'}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#1A73E8" d="M12 3.2 4.3 16.5l2.4 4.3H19l2.7-4.8L14 3.2h-2z" />
              <path fill="#34A853" d="M9.1 8.3h5.8l2.4 4.2h-5.8z" />
              <path fill="#FBBC04" d="M4.3 16.5 6.7 12l2.4 4.3-2.4 4.3z" />
            </svg>
            <span>Connect Drive</span>
            <span className={classNames('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', driveConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
              {driveConnected ? 'Connected' : 'Disconnected'}
            </span>
          </button>
          <button
            type="button"
            onClick={backupNow}
            disabled={running}
            className="btn-primary disabled:opacity-60"
          >
            {running ? 'Backing up...' : 'Backup Now'}
          </button>
      </PageHeader>
      {driveError && <div className="text-sm text-red-600">{driveError}</div>}

      <SectionCard title="Recent Backups" action={<span className="badge-neutral">Max 3 rows</span>}>
        <div className="table-responsive overflow-x-auto">
          <table className="table-premium">
              <thead>
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
                    {row.status === 'success' && row.file_exists ? (
                      <a
                        className="text-blue-600 text-sm hover:underline"
                        href={`/api/backups/download.php?file=${encodeURIComponent(row.file_name)}`}
                        download
                      >
                        Download
                      </a>
                    ) : row.status === 'success' ? (
                      <button
                        type="button"
                        className="text-amber-600 text-sm"
                        onClick={() =>
                          setToast({
                            message: 'Backup file is missing on the server. Please run a new backup.',
                            type: 'warning',
                          })
                        }
                      >
                        Missing
                      </button>
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
      </SectionCard>
    </div>
  );
}
