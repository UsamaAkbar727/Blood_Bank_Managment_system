import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserRound, Plus } from 'lucide-react';
import { request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { PageHeader, useScrollReveal } from '../components/UI';

const blankForm = {
  id: null,
  full_name: '',
  blood_group: '',
  gender: '',
  age: '',
  contact: '',
  hospital_name: '',
  hospital_id: '',
  medical_history: '',
  status: 'active',
};

export default function Patients() {
  useScrollReveal();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const res = await request(`/api/patients/index.php?q=${encodeURIComponent(q)}`);
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadHistory = useCallback(async (patientId) => {
    if (!patientId) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await request(`/api/patients/history.php?id=${patientId}`);
      setHistoryRows(res.data || []);
    } catch (err) {
      setHistoryRows([]);
      setHistoryError(err.message || 'Unable to load issuance history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPatient = (row) => {
    setSelectedPatient(row);
    setDrawerOpen(true);
    loadHistory(row.id);
  };

  const edit = (row) => {
    setForm({
      ...blankForm,
      ...row,
      age: row.age ?? row.computed_age ?? '',
      contact: row.contact ?? row.phone ?? '',
      hospital_name: row.hospital_name ?? row.ward_name ?? '',
    });
    setOpen(true);
  };

  const remove = async (id) => {
    try {
      await request(`/api/patients/index.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Patient removed successfully.', type: 'success' });
      load();
    } catch (err) {
      const friendlyMessage =
        err.message === 'patient_has_blood_issuances'
          ? 'This patient cannot be deleted because blood issuances already reference them.'
          : err.message === 'patient_has_billing_records'
            ? 'This patient cannot be deleted because billing records already reference them.'
            : err.message || 'Unable to remove patient.';
      setToast({ message: friendlyMessage, type: 'error' });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/patients/index.php?id=${form.id}` : '/api/patients/index.php';
    const payload = {
      full_name: form.full_name,
      blood_group: form.blood_group,
      gender: form.gender,
      age: form.age,
      contact: form.contact,
      hospital_id: form.hospital_id,
      hospital_name: form.hospital_name,
      medical_history: form.medical_history,
      status: form.status,
    };
    try {
      await request(url, { method, body: payload });
      setToast({ message: form.id ? 'Patient updated successfully.' : 'Patient added successfully.', type: 'success' });
      setForm(blankForm);
      setOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Save failed');
    }
  };

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-5 page-stagger">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <PageHeader
        icon={UserRound}
        title="Patients"
        subtitle="Central record of transfusion recipients and their issuance history"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
          placeholder="Search by name, ID, blood group, contact"
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
          Add Patient
        </button>
      </PageHeader>

      <div className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="table-premium">
              <thead>
              <tr>
                <th className="px-4 py-2">Patient Name / ID</th>
                <th className="px-4 py-2">Blood Group</th>
                <th className="px-4 py-2">Hospital / Ward</th>
                <th className="px-4 py-2">Contact Number</th>
                <th className="px-4 py-2">Gender / Age</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <button className="text-left" onClick={() => openPatient(row)}>
                      <div className="font-medium text-slate-800">{row.full_name}</div>
                      <div className="text-xs text-slate-500">{row.patient_code}</div>
                    </button>
                  </td>
                  <td className="px-4 py-2">{row.blood_group}</td>
                  <td className="px-4 py-2">{row.hospital_name || row.ward_name || '-'}</td>
                  <td className="px-4 py-2">{row.contact || row.phone || '-'}</td>
                  <td className="px-4 py-2">
                    {row.gender || '-'}
                    {row.age || row.computed_age ? ` / ${row.age || row.computed_age}` : ''}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="btn-ghost" onClick={() => openPatient(row)}>
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
                  <td className="px-4 py-3 text-slate-500" colSpan={6}>
                    No patients found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={6}>
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
        title={form.id ? 'Edit Patient' : 'Add Patient'}
      >
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-600">Full Name</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Blood Group</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} required>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => <option key={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Gender</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Age</label>
              <input type="number" min="0" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Contact Number</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Hospital / Ward Name</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Hospital ID</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.hospital_id} onChange={(e) => setForm({ ...form, hospital_id: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Medical History</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.medical_history} onChange={(e) => setForm({ ...form, medical_history: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setForm(blankForm); setError(''); setOpen(false); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {form.id ? 'Update' : 'Save'}
            </button>
          </div>
          {error && <div className="btn-danger">{error}</div>}
        </form>
      </Modal>

      <div className={`fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Issuance History</h3>
              <p className="text-sm text-slate-500">{selectedPatient?.full_name || 'Select a patient'}</p>
            </div>
            <button className="text-slate-500 hover:text-slate-900" onClick={() => setDrawerOpen(false)}>Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedPatient && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                <div><span className="font-medium">Patient ID:</span> {selectedPatient.patient_code}</div>
                <div><span className="font-medium">Blood Group:</span> {selectedPatient.blood_group}</div>
                <div><span className="font-medium">Hospital / Ward:</span> {selectedPatient.hospital_name || '-'}</div>
                <div><span className="font-medium">Contact:</span> {selectedPatient.contact || '-'}</div>
              </div>
            )}
            {historyLoading && <div className="text-sm text-slate-500">Loading issuance history...</div>}
            {!historyLoading && historyError && <div className="text-sm text-red-600">{historyError}</div>}
            {!historyLoading && !historyError && historyRows.length > 0 && (
              <div className="space-y-2">
                {historyRows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900">{row.collection_code}</div>
                      <div className="text-xs text-slate-500">{row.issue_date}</div>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {row.component} | {row.blood_group} | {row.units_issued} unit{row.units_issued > 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Status: {row.status} {row.crossmatch_result ? `· Crossmatch: ${row.crossmatch_result}` : ''}
                    </div>
                    {row.remarks && <div className="text-xs text-slate-500 mt-1">{row.remarks}</div>}
                  </div>
                ))}
              </div>
            )}
            {!historyLoading && !historyError && historyRows.length === 0 && (
              <div className="text-sm text-slate-500">No issuance history available.</div>
            )}
          </div>
        </div>
      </div>
      {drawerOpen && <button className="fixed inset-0 bg-slate-900/30 z-30" aria-label="Close drawer overlay" onClick={() => setDrawerOpen(false)} />}
    </div>
  );
}
