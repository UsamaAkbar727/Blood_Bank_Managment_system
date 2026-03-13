import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

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
};

export default function Donors() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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
      is_eligible: form.is_eligible ? 1 : 0,
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
      setError(err.message || 'Save failed');
    }
  };

  const edit = (row) => {
    setForm({
      ...row,
      id: row.id,
      is_eligible: !!row.is_eligible,
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

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-3">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Donors</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              load(e.target.value);
            }}
            placeholder="Search by name, code, CNIC, blood"
            className="w-full md:w-80 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => {
              setForm(blankForm);
              setError('');
              setOpen(true);
            }}
          >
            Add Donor
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
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
                      {row.is_eligible ? 'Eligible' : 'Hold'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="text-blue-600 text-sm" onClick={() => edit(row)}>
                      Edit
                    </button>
                    <button className="text-red-600 text-sm" onClick={() => remove(row.id)}>
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
                    Loading…
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">CNIC</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.cnic}
                onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                required
                placeholder="12345-1234567-1"
              />
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
          <div className="grid grid-cols-2 gap-3">
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
                  e.target.blur();
                }}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
              checked={form.is_eligible}
              onChange={(e) => setForm({ ...form, is_eligible: e.target.checked })}
              className="h-4 w-4"
            />
            Eligible to donate
          </label>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              {form.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
