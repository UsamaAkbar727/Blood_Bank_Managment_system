import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [donors, setDonors] = useState([]);
  const [donorSearch, setDonorSearch] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorDropdownOpen, setDonorDropdownOpen] = useState(false);
  const [donorLoadError, setDonorLoadError] = useState('');
  const dateTimeBlurTimer = useRef(null);
  const dateTimeParts = useRef({ date: '', time: '' });
  const hasPickedDate = useRef(false);
  const hasPickedTime = useRef(false);
  const dateTimeCloseSink = useRef(null);

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

  const loadDonors = useCallback(
    async (q = donorSearch) => {
      try {
        setDonorLoadError('');
        const res = await request(`/api/donors/index.php?q=${encodeURIComponent(q)}&eligible=1`);
        setDonors(res.data || []);
      } catch (err) {
        setDonors([]);
        setDonorLoadError(err.message || 'Unable to load donors');
      }
    },
    [donorSearch],
  );

  useEffect(() => {
    if (open) {
      loadDonors('');
    }
  }, [open, loadDonors]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const isEdit = Boolean(form.id);
    
    // Validate required fields
    if (!form.donor_id) {
      setError('Please select a donor');
      return;
    }
    if (selectedDonor && Number(selectedDonor.is_eligible) !== 1) {
      setError('Selected donor is not eligible for collection. Please choose an eligible donor.');
      return;
    }
    if (!form.collection_date) {
      setError('Please enter collection date');
      return;
    }
    if (!form.volume_ml) {
      setError('Please enter volume');
      return;
    }
    
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
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/collections/index.php?id=${form.id}` : '/api/collections/index.php';
    try {
      const response = await request(url, { method, body: payload });
      setToast({
        message: isEdit ? 'Collection updated successfully.' : 'Collection added successfully.',
        type: 'success',
      });
      setForm(blank);
      setOpen(false);
      load();
    } catch (err) {
      if (err.message === 'duplicate_collection_code') {
        setError('This collection code already exists. Please use a different code.');
      } else if (err.message === 'donor_not_found') {
        setError('Selected donor not found. Please choose a valid donor.');
      } else {
        setError(err.message || 'Save failed');
      }
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
    setDonorSearch(row.donor_name || '');
    setOpen(true);
  };

  const donorBlurTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (dateTimeBlurTimer.current) {
        clearTimeout(dateTimeBlurTimer.current);
      }
      if (donorBlurTimer.current) {
        clearTimeout(donorBlurTimer.current);
      }
    };
  }, []);

  const handleDateTimePicker = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, collection_date: value }));

    if (event.target.type !== 'datetime-local') return;

    if (!value) {
      hasPickedDate.current = false;
      hasPickedTime.current = false;
      dateTimeParts.current = { date: '', time: '' };
      return;
    }

    const [nextDate, nextTime] = value.split('T');
    const prevDate = dateTimeParts.current.date;
    const prevTime = dateTimeParts.current.time;

    const dateChanged = nextDate !== prevDate;
    const timeChanged = nextTime !== prevTime;

    if (dateChanged) {
      hasPickedDate.current = true;
    }

    dateTimeParts.current = { date: nextDate, time: nextTime };

    const initialTimeWasEmpty = !prevTime;
    if (timeChanged && !(dateChanged && initialTimeWasEmpty)) {
      hasPickedTime.current = true;
    }

    if (nextDate && nextTime && hasPickedDate.current && hasPickedTime.current) {
      if (dateTimeBlurTimer.current) {
        clearTimeout(dateTimeBlurTimer.current);
      }
      dateTimeBlurTimer.current = window.setTimeout(() => {
        if (document.activeElement === event.target) {
          event.target.blur();
        }
        if (dateTimeCloseSink.current) {
          dateTimeCloseSink.current.focus();
        }
        hasPickedDate.current = false;
        hasPickedTime.current = false;
        dateTimeBlurTimer.current = null;
      }, 0);
    }
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
              setDonorSearch('');
              setDonors([]);
              setSelectedDonor(null);
              setDonorDropdownOpen(false);
              setDonorLoadError('');
              hasPickedDate.current = false;
              hasPickedTime.current = false;
              dateTimeParts.current = { date: '', time: '' };
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
                <th className="px-4 py-2">Phlebotomist</th>
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
                  <td className="px-4 py-2">{row.collected_by_name || '-'}</td>
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
                  <td className="px-4 py-3 text-slate-500" colSpan={8}>
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
          setDonorSearch('');
          setDonors([]);
          setSelectedDonor(null);
          setDonorDropdownOpen(false);
          setDonorLoadError('');
          hasPickedDate.current = false;
          hasPickedTime.current = false;
          dateTimeParts.current = { date: '', time: '' };
        }}
        title={form.id ? 'Edit Collection' : 'Add Collection'}
      >
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-600">Select Donor *</label>
            <input
              type="text"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Search by name, code, CNIC, or blood group"
              value={donorSearch}
              onChange={(e) => {
                setDonorSearch(e.target.value);
                loadDonors(e.target.value);
              }}
              onFocus={() => {
                setDonorDropdownOpen(true);
                loadDonors(donorSearch);
              }}
              onBlur={() => {
                donorBlurTimer.current = window.setTimeout(() => {
                  setDonorDropdownOpen(false);
                }, 150);
              }}
            />
            {donorDropdownOpen && (
              <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-white z-10">
                {donorLoadError && <div className="px-3 py-2 text-sm text-rose-600">{donorLoadError}</div>}
                {!donorLoadError && donors.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">No eligible donors found.</div>
                )}
                {!donorLoadError &&
                  donors.map((donor) => {
                    const eligible = Number(donor.is_eligible ?? 1) === 1;
                    return (
                      <button
                        key={donor.id}
                        type="button"
                        disabled={!eligible}
                        className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-b-0 transition-colors ${eligible ? 'hover:bg-blue-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        onClick={() => {
                          if (!eligible) return;
                          setForm({ ...form, donor_id: donor.id });
                          setSelectedDonor(donor);
                          setDonorSearch(`${donor.full_name} (${donor.blood_group})`);
                          setDonors([]);
                          setDonorDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium text-slate-900">{donor.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {donor.donor_code} | {donor.blood_group} | {donor.cnic}
                          {!eligible && <span className="ml-2 text-rose-600">(Not Eligible)</span>}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
            {form.donor_id && (
              <p className="text-xs text-slate-500 mt-1">
                ✓ Donor ID: {form.donor_id}
              </p>
            )}
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
              onChange={handleDateTimePicker}
              required
            />
            <button
              type="button"
              ref={dateTimeCloseSink}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
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
                hasPickedDate.current = false;
                hasPickedTime.current = false;
                dateTimeParts.current = { date: '', time: '' };
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
