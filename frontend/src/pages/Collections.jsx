import React, { useCallback, useEffect, useState } from 'react';
import { request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const blank = {
  id: null,
  donor_id: '',
  collection_code: '',
  collection_date: '',
  bag_type: '450ml',
  volume_ml: '',
  collection_site: '',
  expiry_date_override: '',
  status: 'pending_screen',
  remarks: '',
};

function addDays(dateTimeValue, days) {
  if (!dateTimeValue || !days) return '';
  const date = new Date(dateTimeValue);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export default function Collections() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [expiryRule, setExpiryRule] = useState({ component: 'Whole Blood', shelf_life_days: 35, allow_manual_override: true });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = useCallback(
    async (q = search) => {
      const res = await request(`/api/collections/index.php?q=${encodeURIComponent(q)}`);
      setRows(res.data || []);
    },
    [search],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await request('/api/settings/expiry.php');
        const wholeBloodRule = (res.data || []).find((item) => item.component === 'Whole Blood');
        if (wholeBloodRule) {
          setExpiryRule(wholeBloodRule);
        }
      } catch (err) {
        // Keep sane fallback if settings are unavailable.
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const id = setInterval(() => load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const isEdit = Boolean(form.id);
    const payload = {
      donor_id: Number(form.donor_id),
      collection_code: form.collection_code || undefined,
      collection_date: form.collection_date.replace('T', ' '),
      bag_type: form.bag_type,
      volume_ml: Number(form.volume_ml),
      collection_site: form.collection_site,
      expiry_date_override: form.expiry_date_override || null,
      status: form.status,
      remarks: form.remarks,
    };
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/collections/index.php?id=${form.id}` : '/api/collections/index.php';
    try {
      await request(url, { method, body: payload });
      setToast({
        message: isEdit ? 'Collection updated successfully.' : 'Collection added successfully.',
        type: 'success',
      });
      setForm(blank);
      setOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Save failed');
    }
  };

  const edit = async (id) => {
    const res = await request(`/api/collections/index.php?id=${id}`);
    const row = res.data;
    if (!row) return;
    setForm({
      id: row.id,
      donor_id: row.donor_id,
      collection_code: row.collection_code,
      collection_date: (row.collection_date || '').replace(' ', 'T'),
      bag_type: row.bag_type,
      volume_ml: row.volume_ml,
      collection_site: row.collection_site || '',
      expiry_date_override: row.expiry_date_override || '',
      status: row.status,
      remarks: row.remarks || '',
    });
    setOpen(true);
  };

  const computedExpiry = addDays(form.collection_date, expiryRule.shelf_life_days);

  const remove = async (id) => {
    try {
      await request(`/api/collections/index.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Collection removed successfully.', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message || 'Unable to remove collection. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="space-y-3">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-900">Recent Collections</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              load(e.target.value);
            }}
            placeholder="Search by code, donor, blood group"
            className="w-full md:w-80 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => {
              setForm(blank);
              setError('');
              setOpen(true);
            }}
          >
            Add Collection
          </button>
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Donor</th>
                <th className="px-4 py-2">Blood</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Volume</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{row.collection_code}</td>
                  <td className="px-4 py-2">{row.donor_name || ''}</td>
                  <td className="px-4 py-2">{row.blood_group || ''}</td>
                  <td className="px-4 py-2">{row.collection_date}</td>
                  <td className="px-4 py-2">{row.volume_ml} ml</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">{row.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="text-blue-600 text-sm" onClick={() => edit(row.id)}>
                      Edit
                    </button>
                    <button className="text-red-600 text-sm" onClick={() => remove(row.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={7}>
                    No records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setForm(blank);
          setError('');
        }}
        title={form.id ? 'Edit Collection' : 'Add Collection'}
      >
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-600">Donor ID</label>
            <input
              type="number"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={form.donor_id}
              onChange={(e) => setForm({ ...form, donor_id: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">Link to donor by ID.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Bag Number</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.collection_code}
                onChange={(e) => setForm({ ...form, collection_code: e.target.value })}
                placeholder="auto if blank"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Bag Type</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.bag_type}
                onChange={(e) => setForm({ ...form, bag_type: e.target.value })}
              >
                <option value="350ml">350ml</option>
                <option value="450ml">450ml</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Collection Date/Time</label>
            <input
              type="datetime-local"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={form.collection_date}
              onChange={(e) => setForm({ ...form, collection_date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Volume (ml)</label>
              <input
                type="number"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.volume_ml}
                onChange={(e) => setForm({ ...form, volume_ml: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Site</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.collection_site}
                onChange={(e) => setForm({ ...form, collection_site: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Default Expiry</label>
              <input
                type="text"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
                value={computedExpiry || ''}
                readOnly
              />
              <p className="text-xs text-slate-500 mt-1">Whole Blood uses {expiryRule.shelf_life_days} days from collection date by default.</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Manual Expiry Override</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"
                value={form.expiry_date_override}
                onChange={(e) => setForm({ ...form, expiry_date_override: e.target.value })}
                disabled={!expiryRule.allow_manual_override}
              />
              <p className="text-xs text-slate-500 mt-1">
                {expiryRule.allow_manual_override ? 'Leave blank to use the default calculated expiry.' : 'Manual override is disabled in Settings.'}
              </p>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Status</label>
            <select
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="pending_screen">Pending Screen</option>
              <option value="screening">Screening</option>
              <option value="safe">Safe</option>
              <option value="rejected">Rejected</option>
              <option value="stored">Stored</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Remarks</label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setForm(blank);
                setError('');
                setOpen(false);
              }}
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" type="submit">
              {form.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
