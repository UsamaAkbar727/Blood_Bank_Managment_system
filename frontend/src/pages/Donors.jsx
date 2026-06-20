import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HeartHandshake, Plus } from 'lucide-react';
import { request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { PageHeader, useScrollReveal } from '../components/UI';

const blankForm = {
  id: null,
  full_name: '',
  cnic: '',
  blood_group: '',
  gender: '',
  date_of_birth: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  is_eligible: true,
  manual_hold: false,
  deferral_reason: '',
  deferred_until: '',
  eligibility_checked_at: '',
};

export default function Donors() {
  useScrollReveal();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyDonor, setHistoryDonor] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = useCallback(
    async (q = search) => {
      setLoading(true);
      try {
        const res = await request(`/api/donors/index.php?q=${encodeURIComponent(q)}`);
        setRows(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load donors');
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(), 12000);
    return () => clearInterval(id);
  }, [load]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validation for CNIC
    const digitsOnly = form.cnic.replace(/\D/g, '');
    if (digitsOnly.length !== 13) {
      setError('CNIC must be exactly 13 digits.');
      return;
    }
    if (!/^\d+$/.test(digitsOnly)) {
      setError('CNIC must contain only numeric digits.');
      return;
    }
    
    const isEdit = Boolean(form.id);
    const payload = {
      full_name: form.full_name,
      cnic: form.cnic,
      blood_group: form.blood_group,
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      phone: form.phone,
      email: form.email,
      city: form.city,
      address: form.address,
      manual_hold: form.manual_hold ? 1 : 0,
    };
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/donors/index.php?id=${form.id}` : '/api/donors/index.php';
    try {
      await request(url, { method, body: payload });
      setToast({
        message: isEdit ? 'Donor updated successfully.' : 'Donor added successfully.',
        type: 'success',
      });
      setForm(blankForm);
      setOpen(false);
      load();
    } catch (err) {
      if (err.message === 'invalid_cnic') {
        setError('Invalid CNIC format. Please enter exactly 13 digits.');
      } else if (err.message === 'duplicate_cnic_or_code') {
        setError('This CNIC is already registered in the system.');
      } else {
        setError(err.message || 'Save failed');
      }
    }
  };

  const edit = (row) => {
    setForm({
      ...row,
      id: row.id,
      is_eligible: !!row.is_eligible,
      manual_hold: Boolean(row.manual_hold),
    });
    setOpen(true);
  };

  const remove = async (id) => {
    try {
      await request(`/api/donors/index.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Donor removed successfully.', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message || 'Unable to remove donor. Please try again.', type: 'error' });
    }
  };

  const openHistory = async (row) => {
    setHistoryDonor(row);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await request(`/api/donors/history.php?id=${row.id}`);
      setHistoryRows(res.data || []);
    } catch (err) {
      setHistoryRows([]);
      setHistoryError(err.message || 'Unable to load donation history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-5 page-stagger">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <PageHeader icon={HeartHandshake} title="Donors" subtitle="Manage donor records and eligibility">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
          placeholder="Search by name, code, CNIC, blood"
          className="input-field w-full md:w-80"
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setForm(blankForm);
            setError('');
            setOpen(true);
          }}
        >
          <Plus size={16} />
          Add Donor
        </button>
      </PageHeader>

      <div className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="table-premium">
              <thead>
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">CNIC</th>
                <th className="px-4 py-2">Blood</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Eligibility</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{row.donor_code}</td>
                  <td className="px-4 py-2">{row.full_name}</td>
                  <td className="px-4 py-2">{row.cnic}</td>
                  <td className="px-4 py-2">{row.blood_group}</td>
                  <td className="px-4 py-2">{row.city || ''}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        row.is_eligible ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {row.is_eligible ? 'Eligible' : 'Deferred'}
                    </span>
                    {!row.is_eligible && (row.deferral_reason || row.deferred_until) && (
                      <div className="text-xs text-slate-500 mt-1">
                        {row.deferral_reason ? row.deferral_reason : 'Deferred'}
                        {row.deferred_until ? ` · Until ${row.deferred_until}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="btn-ghost" onClick={() => openHistory(row)}>
                      History
                    </button>
                    <button className="btn-ghost" onClick={() => edit(row)}>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => remove(row.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={7}>
                    No donors found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={7}>
                    Loading...
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
          setForm(blankForm);
          setError('');
        }}
        title={form.id ? 'Edit Donor' : 'Add Donor'}
      >
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-600">Full Name</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">CNIC</label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-mono"
                value={form.cnic}
                onChange={(e) => {
                  // Extract only numeric digits
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  
                  // Limit to 13 digits
                  if (digitsOnly.length <= 13) {
                    // Auto-format as user types: 5-7-1 pattern
                    let formatted = digitsOnly;
                    if (digitsOnly.length > 5) {
                      formatted = digitsOnly.slice(0, 5) + '-' + digitsOnly.slice(5);
                    }
                    if (digitsOnly.length > 12) {
                      formatted = digitsOnly.slice(0, 5) + '-' + digitsOnly.slice(5, 12) + '-' + digitsOnly.slice(12);
                    }
                    setForm({ ...form, cnic: formatted });
                  }
                }}
                maxLength="15"
                placeholder="12345-1234567-1"
                required
              />
              <p className="text-xs text-slate-500 mt-1">13 digits (format: XXXXX-XXXXXXX-X)</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Blood Group</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                required
              >
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Gender</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                required
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Date of Birth</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.date_of_birth}
                onChange={(e) => {
                  setForm({ ...form, date_of_birth: e.target.value });
                }}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Phone</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Email</label>
              <input
                type="email"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">City</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Address</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!form.manual_hold}
              onChange={(e) => setForm({ ...form, manual_hold: !e.target.checked })}
              className="h-4 w-4"
            />
            Eligible to donate (uncheck to place manual hold)
          </label>
          {(form.manual_hold || !form.is_eligible) && (
            <div className="text-xs text-slate-500">
              {form.manual_hold ? 'Manual hold enabled. Eligibility will be recalculated after saving.' : (form.deferral_reason || 'Deferred')}
              {!form.manual_hold && form.deferred_until ? ` · Until ${form.deferred_until}` : ''}
            </div>
          )}
          {error && <div className="btn-danger">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setForm(blankForm);
                setError('');
                setOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {form.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryRows([]);
          setHistoryError('');
          setHistoryDonor(null);
        }}
        title={`Donation History${historyDonor ? ` · ${historyDonor.full_name}` : ''}`}
      >
        <div className="space-y-3">
          {historyLoading && <div className="text-sm text-slate-500">Loading donation history...</div>}
          {!historyLoading && historyError && <div className="text-sm text-red-600">{historyError}</div>}
          {!historyLoading && !historyError && (
            <div className="table-responsive overflow-x-auto">
              <table className="table-premium">
              <thead>
                  <tr>
                    <th className="px-4 py-2">Collection</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Bag</th>
                    <th className="px-4 py-2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, idx) => (
                    <tr key={`${row.collection_code}-${idx}`} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{row.collection_code}</td>
                      <td className="px-4 py-2">{row.collection_date}</td>
                      <td className="px-4 py-2">{row.status}</td>
                      <td className="px-4 py-2">{row.bag_type || '-'}</td>
                      <td className="px-4 py-2">{row.volume_ml ? `${row.volume_ml} ml` : '-'}</td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={5}>
                        No donation history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <button
              className="btn-secondary"
              onClick={() => {
                setHistoryOpen(false);
                setHistoryRows([]);
                setHistoryError('');
                setHistoryDonor(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
