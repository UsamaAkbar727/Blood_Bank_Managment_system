import React, { useEffect, useState } from 'react';
import Toast from '../components/Toast';
import { request } from '../lib/api';

export default function Settings() {
  const [rules, setRules] = useState([]);
  const [medical, setMedical] = useState(null);
  const [backupSettings, setBackupSettings] = useState(null);
  const [error, setError] = useState('');
  const [medicalError, setMedicalError] = useState('');
  const [backupError, setBackupError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  const [medicalLoading, setMedicalLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(true);
  const [medicalSaving, setMedicalSaving] = useState(false);
  const [backupSaving, setBackupSaving] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [activeTab, setActiveTab] = useState('backup');

  useEffect(() => {
    const load = async () => {
      const [expiryRes, medicalRes, backupRes] = await Promise.allSettled([
        request('/api/settings/expiry.php'),
        request('/api/settings/medical.php'),
        request('/api/settings/backups.php'),
      ]);

      if (expiryRes.status === 'fulfilled') setRules(expiryRes.value.data || []);
      else setError(expiryRes.reason?.message || 'Failed to load settings.');

      if (medicalRes.status === 'fulfilled') setMedical(medicalRes.value.data || null);
      else setMedicalError(medicalRes.reason?.message || 'Failed to load medical criteria.');

      if (backupRes.status === 'fulfilled') setBackupSettings(backupRes.value.data || null);
      else setBackupError(backupRes.reason?.message || 'Failed to load backup settings.');

      setLoading(false);
      setMedicalLoading(false);
      setBackupLoading(false);
    };
    load();
  }, []);

  const loadDriveStatus = async () => {
    setDriveLoading(true);
    setDriveError('');
    try {
      setDriveStatus(await request('/api/reports/drive-status.php'));
    } catch (err) {
      setDriveError(err.message || 'Failed to load Google Drive status.');
    } finally {
      setDriveLoading(false);
    }
  };

  useEffect(() => {
    loadDriveStatus();
  }, []);

  const updateRule = (component, patch) => setRules((current) => current.map((rule) => (rule.component === component ? { ...rule, ...patch } : rule)));

  const saveExpiry = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await request('/api/settings/expiry.php', { method: 'PUT', body: { rules } });
      setRules(res.data || []);
      setToast({ message: 'Expiry settings updated.', type: 'success' });
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const saveMedical = async () => {
    if (!medical) return;
    setMedicalSaving(true);
    setMedicalError('');
    try {
      const res = await request('/api/settings/medical.php', { method: 'PUT', body: medical });
      setMedical(res.data || medical);
      setToast({ message: 'Medical criteria updated.', type: 'success' });
    } catch (err) {
      setMedicalError(err.message || 'Failed to save medical criteria.');
    } finally {
      setMedicalSaving(false);
    }
  };

  const saveBackupSettings = async () => {
    if (!backupSettings) return;
    setBackupSaving(true);
    setBackupError('');
    try {
      const res = await request('/api/settings/backups.php', { method: 'PUT', body: backupSettings });
      setBackupSettings(res.data || backupSettings);
      setToast({ message: 'Backup settings updated.', type: 'success' });
    } catch (err) {
      setBackupError(err.message || 'Failed to save backup settings.');
    } finally {
      setBackupSaving(false);
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
          <p className="text-sm text-slate-500">Manage backup schedules, cloud storage, and clinical configuration in one place.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setActiveTab('backup')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'backup' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Backup Settings</button>
          <button type="button" onClick={() => setActiveTab('clinical')} className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'clinical' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Clinical Settings</button>
        </div>
      </section>

      {activeTab === 'backup' && (
        <>
          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Backup Configuration</h2>
                <p className="text-sm text-slate-500">Set automated backup timing, Drive target, and local retention rules.</p>
              </div>
              <button type="button" onClick={saveBackupSettings} disabled={backupSaving || backupLoading || !backupSettings} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm">
                {backupSaving ? 'Saving...' : 'Save Backup Settings'}
              </button>
            </div>
            {backupLoading && <div className="text-sm text-slate-500">Loading backup settings...</div>}
            {!backupLoading && backupSettings && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-slate-600">Frequency</label>
                  <select value={backupSettings.frequency} onChange={(e) => setBackupSettings({ ...backupSettings, frequency: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600">Execution Time</label>
                  <input type="time" value={(backupSettings.scheduled_time || '00:00:00').slice(0, 5)} onChange={(e) => setBackupSettings({ ...backupSettings, scheduled_time: `${e.target.value}:00` })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-slate-600">Weekly Day (1=Mon, 7=Sun)</label>
                  <input type="number" min="1" max="7" value={backupSettings.scheduled_day_of_week} onChange={(e) => setBackupSettings({ ...backupSettings, scheduled_day_of_week: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-slate-600">Retention (days)</label>
                  <input type="number" min="1" value={backupSettings.retention_days} onChange={(e) => setBackupSettings({ ...backupSettings, retention_days: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(backupSettings.auto_delete_local)} onChange={(e) => setBackupSettings({ ...backupSettings, auto_delete_local: e.target.checked })} />
                  <span>Auto-delete local files after retention period</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(backupSettings.drive_enabled)} onChange={(e) => setBackupSettings({ ...backupSettings, drive_enabled: e.target.checked })} />
                  <span>Enable Google Drive upload</span>
                </label>
              </div>
            )}
            {backupError && <div className="text-sm text-red-600">{backupError}</div>}
          </section>

          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Drive Configuration</h2>
                <p className="text-sm text-slate-500">Manage the Drive folder and credentials used for automated uploads.</p>
              </div>
              <div className="flex items-center gap-2">
                {driveStatus?.auth_url && (
                  <a className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" href={driveStatus.auth_url} target="_blank" rel="noopener noreferrer">
                    {driveStatus?.status?.authenticated ? 'Reconnect' : 'Connect'}
                  </a>
                )}
                <button type="button" onClick={disconnectDrive} disabled={driveBusy || !driveStatus?.status?.authenticated} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                  Disconnect
                </button>
                <button type="button" onClick={loadDriveStatus} disabled={driveLoading} className="border border-slate-200 px-4 py-2 rounded-lg text-sm">
                  {driveLoading ? 'Checking...' : 'Refresh Status'}
                </button>
              </div>
            </div>
            {!backupLoading && backupSettings && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-slate-600">Google Drive Folder ID</label>
                  <input value={backupSettings.drive_folder_id || ''} onChange={(e) => setBackupSettings({ ...backupSettings, drive_folder_id: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-slate-600">Credentials JSON Path</label>
                  <input value={backupSettings.drive_credentials_path || ''} onChange={(e) => setBackupSettings({ ...backupSettings, drive_credentials_path: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div className="text-slate-500">Last run: {backupSettings.last_run_at || '-'}</div>
              </div>
            )}
            {driveLoading && <div className="text-sm text-slate-500">Checking Google Drive status...</div>}
            {!driveLoading && driveStatus && (
              <div className="grid gap-2 text-sm">
                <div className={driveStatus.ready ? 'text-emerald-700' : 'text-amber-700'}>{driveStatus.message}</div>
                {driveStatus.checks && (
                  <div className="grid md:grid-cols-3 gap-2">
                    {Object.entries(driveStatus.checks).map(([key, item]) => (
                      <div key={key} className="border border-slate-200 rounded-lg p-3">
                        <div className="font-medium text-slate-900">{key.replace('_', ' ')}</div>
                        <div className={item.pass ? 'text-emerald-700' : 'text-rose-700'}>{item.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {driveError && <div className="text-sm text-red-600">{driveError}</div>}
          </section>
        </>
      )}

      {activeTab === 'clinical' && (
        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Medical Eligibility Criteria</h2>
              <p className="text-sm text-slate-500">Control donor eligibility rules and automated deferral windows.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={saveExpiry} disabled={loading} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                {loading ? 'Saving...' : 'Save Expiry'}
              </button>
              <button type="button" onClick={saveMedical} disabled={medicalSaving || medicalLoading || !medical} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm">
                {medicalSaving ? 'Saving...' : 'Save Medical Criteria'}
              </button>
            </div>
          </div>
          {medicalLoading && <div className="text-sm text-slate-500">Loading medical criteria...</div>}
          {!medicalLoading && medical && (
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div><label className="text-slate-600">Minimum Age (years)</label><input type="number" min="16" value={medical.min_age_years} onChange={(e) => setMedical({ ...medical, min_age_years: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /></div>
              <div><label className="text-slate-600">Maximum Age (years)</label><input type="number" min="18" value={medical.max_age_years} onChange={(e) => setMedical({ ...medical, max_age_years: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /></div>
              <div><label className="text-slate-600">Minimum Donation Interval (days)</label><input type="number" min="30" value={medical.min_interval_days} onChange={(e) => setMedical({ ...medical, min_interval_days: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /></div>
              <div><label className="text-slate-600">Min Hemoglobin (Male g/dL)</label><input type="number" step="0.1" min="10" value={medical.min_hb_male} onChange={(e) => setMedical({ ...medical, min_hb_male: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /></div>
              <div><label className="text-slate-600">Min Hemoglobin (Female g/dL)</label><input type="number" step="0.1" min="10" value={medical.min_hb_female} onChange={(e) => setMedical({ ...medical, min_hb_female: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /></div>
              <div><label className="text-slate-600">Low Hb Deferral (days)</label><input type="number" min="0" value={medical.low_hb_deferral_days} onChange={(e) => setMedical({ ...medical, low_hb_deferral_days: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /></div>
              <div><label className="text-slate-600">Reactive Deferral (days)</label><input type="number" min="0" value={medical.reactive_deferral_days} onChange={(e) => setMedical({ ...medical, reactive_deferral_days: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" /><div className="text-xs text-slate-500 mt-1">Set to 0 for permanent deferral.</div></div>
            </div>
          )}
          {medicalError && <div className="text-sm text-red-600">{medicalError}</div>}
        </section>
      )}

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
                  <td className="px-4 py-3"><input type="number" min="1" value={rule.shelf_life_days} onChange={(e) => updateRule(rule.component, { shelf_life_days: Number(e.target.value) })} className="w-28 border border-slate-200 rounded-lg px-3 py-2" /></td>
                  <td className="px-4 py-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(rule.allow_manual_override)} onChange={(e) => updateRule(rule.component, { allow_manual_override: e.target.checked })} /><span className="text-slate-700">Allow</span></label></td>
                  <td className="px-4 py-3 text-slate-500">{rule.updated_at || '-'}</td>
                </tr>
              ))}
              {!loading && rules.length === 0 && <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>No settings found.</td></tr>}
              {loading && <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>Loading...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
