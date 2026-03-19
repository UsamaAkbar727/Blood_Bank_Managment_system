import React, { useEffect, useState } from 'react';
import Toast from '../components/Toast';
import { request } from '../lib/api';

export default function Settings() {
  const [rules, setRules] = useState([]);
  const [medical, setMedical] = useState(null);
  const [error, setError] = useState('');
  const [medicalError, setMedicalError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(true);
  const [medicalSaving, setMedicalSaving] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [expiryRes, medicalRes] = await Promise.allSettled([
        request('/api/settings/expiry.php'),
        request('/api/settings/medical.php'),
      ]);

      if (expiryRes.status === 'fulfilled') {
        setRules(expiryRes.value.data || []);
      } else {
        setError(expiryRes.reason?.message || 'Failed to load settings.');
      }

      if (medicalRes.status === 'fulfilled') {
        setMedical(medicalRes.value.data || null);
      } else {
        setMedicalError(medicalRes.reason?.message || 'Failed to load medical criteria.');
      }

      setLoading(false);
      setMedicalLoading(false);
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

  const saveMedical = async () => {
    if (!medical) return;
    setMedicalSaving(true);
    setMedicalError('');
    try {
      const res = await request('/api/settings/medical.php', {
        method: 'PUT',
        body: medical,
      });
      setMedical(res.data || medical);
      setToast({ message: 'Medical criteria updated.', type: 'success' });
    } catch (err) {
      setMedicalError(err.message || 'Failed to save medical criteria.');
    } finally {
      setMedicalSaving(false);
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
            <h2 className="text-lg font-semibold text-slate-900">Medical Eligibility Criteria</h2>
            <p className="text-sm text-slate-500">Control donor eligibility rules and automated deferral windows.</p>
          </div>
          <button
            type="button"
            onClick={saveMedical}
            disabled={medicalSaving || medicalLoading || !medical}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm"
          >
            {medicalSaving ? 'Saving...' : 'Save Medical Criteria'}
          </button>
        </div>

        {medicalLoading && <div className="text-sm text-slate-500">Loading medical criteria...</div>}
        {!medicalLoading && medical && (
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="text-slate-600">Minimum Age (years)</label>
              <input
                type="number"
                min="16"
                value={medical.min_age_years}
                onChange={(e) => setMedical({ ...medical, min_age_years: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-600">Maximum Age (years)</label>
              <input
                type="number"
                min="18"
                value={medical.max_age_years}
                onChange={(e) => setMedical({ ...medical, max_age_years: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-600">Minimum Donation Interval (days)</label>
              <input
                type="number"
                min="30"
                value={medical.min_interval_days}
                onChange={(e) => setMedical({ ...medical, min_interval_days: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-600">Min Hemoglobin (Male g/dL)</label>
              <input
                type="number"
                step="0.1"
                min="10"
                value={medical.min_hb_male}
                onChange={(e) => setMedical({ ...medical, min_hb_male: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-600">Min Hemoglobin (Female g/dL)</label>
              <input
                type="number"
                step="0.1"
                min="10"
                value={medical.min_hb_female}
                onChange={(e) => setMedical({ ...medical, min_hb_female: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-600">Low Hb Deferral (days)</label>
              <input
                type="number"
                min="0"
                value={medical.low_hb_deferral_days}
                onChange={(e) => setMedical({ ...medical, low_hb_deferral_days: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-600">Reactive Deferral (days)</label>
              <input
                type="number"
                min="0"
                value={medical.reactive_deferral_days}
                onChange={(e) => setMedical({ ...medical, reactive_deferral_days: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              />
              <div className="text-xs text-slate-500 mt-1">Set to 0 for permanent deferral.</div>
            </div>
          </div>
        )}
        {medicalError && <div className="text-sm text-red-600">{medicalError}</div>}
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
