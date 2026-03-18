import React, { useEffect, useState } from 'react';
import Toast from '../components/Toast';
import { request } from '../lib/api';

export default function Settings() {
  const [rules, setRules] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request('/api/settings/expiry.php');
        setRules(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
    loadDriveStatus();
  }, []);

  const updateRule = (component, patch) => {
    setRules((current) =>
      current.map((rule) => (rule.component === component ? { ...rule, ...patch } : rule)),
    );
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await request('/api/settings/expiry.php', {
        method: 'PUT',
        body: { rules },
      });
      setRules(res.data || []);
      setToast({ message: 'Expiry settings updated.', type: 'success' });
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const disconnectDrive = async () => {
    setDriveBusy(true);
    setDriveError('');
    try {
      await request('/api/reports/drive-disconnect.php', { method: 'POST' });
      setToast({ message: 'Google Drive disconnected.', type: 'success' });
      loadDriveStatus();
    } catch (err) {
      setDriveError(err.message || 'Failed to disconnect Google Drive.');
    } finally {
      setDriveBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />

      <section className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Configure default blood component expiry rules and manual override access.</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Google Drive</h2>
            <p className="text-sm text-slate-500">Connect Google Drive to export reports and backups.</p>
          </div>
          <div className="flex items-center gap-2">
            {driveStatus?.auth_url && (
              <a
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                href={driveStatus.auth_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {driveStatus?.status?.authenticated ? 'Reconnect' : 'Connect'}
              </a>
            )}
            <button
              type="button"
              onClick={disconnectDrive}
              disabled={driveBusy || !driveStatus?.status?.authenticated}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm disabled:opacity-60"
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={loadDriveStatus}
              disabled={driveLoading}
              className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
            >
              {driveLoading ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>
        </div>

        {driveLoading && <div className="text-sm text-slate-500">Checking Google Drive status...</div>}
        {!driveLoading && driveStatus && (
          <div className="grid gap-2 text-sm">
            <div className={driveStatus.ready ? 'text-emerald-700' : 'text-amber-700'}>
              {driveStatus.message}
            </div>
            {driveStatus.checks && (
              <div className="grid md:grid-cols-3 gap-2">
                {Object.entries(driveStatus.checks).map(([key, item]) => (
                  <div key={key} className="border border-slate-200 rounded-lg p-3">
                    <div className="font-medium text-slate-900">{key.replace('_', ' ')}</div>
                    <div className={item.pass ? 'text-emerald-700' : 'text-rose-700'}>
                      {item.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {driveError && <div className="text-sm text-red-600">{driveError}</div>}
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3">Shelf Life (days)</th>
                <th className="px-4 py-3">Manual Override</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.component} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{rule.component}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      value={rule.shelf_life_days}
                      onChange={(e) => updateRule(rule.component, { shelf_life_days: Number(e.target.value) })}
                      className="w-28 border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(rule.allow_manual_override)}
                        onChange={(e) => updateRule(rule.component, { allow_manual_override: e.target.checked })}
                      />
                      <span className="text-slate-700">Allow</span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{rule.updated_at || '-'}</td>
                </tr>
              ))}
              {!loading && rules.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    No settings found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
