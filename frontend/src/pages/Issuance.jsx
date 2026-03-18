import React, { useEffect, useMemo, useState } from 'react';
import { request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const blankPatient = {
  id: null,
  full_name: '',
  blood_group: '',
  gender: '',
  date_of_birth: '',
  diagnosis: '',
  hospital_name: '',
};

const compatibility = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const normalizeBloodGroup = (raw) => {
  if (!raw) return '';
  const base = String(raw).trim().toUpperCase();
  const compact = base.replace(/\s+/g, '').replace(/[–−]/g, '-');
  if (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(compact)) {
    return compact;
  }

  const text = compact.replace('0', 'O');
  if (text.includes('AB')) {
    if (text.includes('NEG')) return 'AB-';
    if (text.includes('POS')) return 'AB+';
  }
  if (text.includes('A') && !text.includes('AB')) {
    if (text.includes('NEG')) return 'A-';
    if (text.includes('POS')) return 'A+';
  }
  if (text.includes('B') && !text.includes('AB')) {
    if (text.includes('NEG')) return 'B-';
    if (text.includes('POS')) return 'B+';
  }
  if (text.includes('O')) {
    if (text.includes('NEG')) return 'O-';
    if (text.includes('POS')) return 'O+';
  }
  return base;
};

export default function Issuance() {
  const [patients, setPatients] = useState([]);
  const [patientForm, setPatientForm] = useState(blankPatient);
  const [patientError, setPatientError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [issuanceHistory, setIssuanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientModal, setPatientModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const loadPatients = async (q = '') => {
    const res = await request(`/api/patients/index.php?q=${encodeURIComponent(q)}`);
    setPatients(res.data || []);
  };

  const loadUnits = async (patient) => {
    setLoadingUnits(true);
    try {
      if (!patient) {
        setUnits([]);
        return;
      }
      const patientBlood = normalizeBloodGroup(patient.blood_group);
      if (!patientBlood) {
        setUnits([]);
        return;
      }
      // Fetch ALL available inventory without blood group restriction
      const res = await request(`/api/inventory/index.php?action=list&status=available`);
      const compatibleBloodGroups = compatibility[patientBlood] || [];
      const data = (res.data || [])
        .filter((u) => compatibleBloodGroups.includes(normalizeBloodGroup(u.blood_group)))
        .sort((a, b) => {
          const dateA = new Date(a.expiry_date || '2099-12-31').getTime();
          const dateB = new Date(b.expiry_date || '2099-12-31').getTime();
          return dateA - dateB;
        });
      setUnits(data);
    } catch (err) {
      console.error('Failed to load units', err);
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadHistory = async (patient) => {
    setLoadingHistory(true);
    try {
      if (!patient) {
        setIssuanceHistory([]);
        return;
      }
      const res = await request(`/api/issuance/index.php?patient_id=${patient.id}`);
      setIssuanceHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load issuance history', err);
      setIssuanceHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadUnits(selectedPatient);
      loadHistory(selectedPatient);
    }, 12000);
    return () => clearInterval(id);
  }, [selectedPatient]);

  const savePatient = async (e) => {
    e.preventDefault();
    setPatientError('');
    const isEdit = Boolean(patientForm.id);
    const payload = {
      full_name: patientForm.full_name,
      blood_group: patientForm.blood_group,
      gender: patientForm.gender,
      date_of_birth: patientForm.date_of_birth,
      diagnosis: patientForm.diagnosis,
      hospital_name: patientForm.hospital_name,
    };
    const method = patientForm.id ? 'PUT' : 'POST';
    const url = patientForm.id ? `/api/patients/index.php?id=${patientForm.id}` : '/api/patients/index.php';
    try {
      await request(url, { method, body: payload });
      setToast({
        message: isEdit ? 'Patient updated successfully.' : 'Patient added successfully.',
        type: 'success',
      });
      setPatientForm(blankPatient);
      setPatientModal(false);
      loadPatients();
    } catch (err) {
      setPatientError(err.message || 'Save failed');
    }
  };

  const issueUnit = async (inventoryId) => {
    if (!selectedPatient) {
      setToast({ message: 'Please select a patient before issuing.', type: 'warning' });
      return;
    }
    const payload = {
      inventory_id: inventoryId,
      patient_id: selectedPatient.id,
      units_issued: 1,
      crossmatch_result: 'compatible',
    };
    try {
      await request('/api/issuance/index.php', { method: 'POST', body: payload });
      await loadUnits(selectedPatient);
      await loadHistory(selectedPatient);
      setToast({ message: 'Unit issued successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Unable to issue unit. Please try again.', type: 'error' });
    }
  };

  const patientOptions = useMemo(
    () => patients.map((p) => ({ value: p.id, label: `${p.patient_code} - ${p.full_name} (${p.blood_group})`, blood: p.blood_group })),
    [patients],
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Search patient by name/code"
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              loadPatients(e.target.value);
            }}
            className="border border-slate-200 rounded-lg px-3 py-2 w-64"
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 min-w-[220px]"
            value={selectedPatient?.id || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const p = patients.find((x) => String(x.id) === String(selectedId));
              setSelectedPatient(p || null);
              loadUnits(p || null);
              loadHistory(p || null);
            }}
          >
            <option value="">Select patient…</option>
            {patientOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => {
              setPatientForm(blankPatient);
              setPatientError('');
              setPatientModal(true);
            }}
          >
            Add Patient
          </button>
        </div>
        <div className="text-xs text-slate-500">Select patient to see compatible units.</div>
      </div>

      <div className="card p-4 w-full min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900">Compatible Available Units (FIFO)</h3>
          {selectedPatient && (
            <span className="text-xs text-slate-500">
              Patient: {normalizeBloodGroup(selectedPatient.blood_group) || selectedPatient.blood_group}
            </span>
          )}
        </div>
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2">Blood</th>
                <th className="px-4 py-2">Expiry</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{u.collection_code}</td>
                  <td className="px-4 py-2">{u.component}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">{u.blood_group}</span>
                  </td>
                  <td className="px-4 py-2">{u.expiry_date}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-blue-600 text-sm" onClick={() => issueUnit(u.id)}>
                      Issue
                    </button>
                  </td>
                </tr>
              ))}
              {loadingUnits ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={5}>
                    Loading compatible units...
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={5}>
                    {selectedPatient ? 'No compatible units available.' : 'Select a patient to view units.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 w-full min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900">Issued History</h3>
          {selectedPatient && <span className="text-xs text-slate-500">Patient: {selectedPatient.patient_code}</span>}
        </div>
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Issue Date</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2">Blood</th>
                <th className="px-4 py-2">Units</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {issuanceHistory.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{row.issue_date}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{row.collection_code || row.inventory_id}</td>
                  <td className="px-4 py-2">{row.component}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">{row.blood_group}</span>
                  </td>
                  <td className="px-4 py-2">{row.units_issued}</td>
                  <td className="px-4 py-2">{row.status}</td>
                </tr>
              ))}
              {loadingHistory ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={6}>
                    Loading issuance history...
                  </td>
                </tr>
              ) : issuanceHistory.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={6}>
                    {selectedPatient ? 'No issuance history found.' : 'Select a patient to view history.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={patientModal}
        onClose={() => {
          setPatientModal(false);
          setPatientForm(blankPatient);
          setPatientError('');
        }}
        title={patientForm.id ? 'Edit Patient' : 'Add Patient'}
      >
        <form className="space-y-3" onSubmit={savePatient}>
          <div>
            <label className="text-sm text-slate-600">Full Name</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={patientForm.full_name}
              onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Blood Group</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={patientForm.blood_group}
                onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                required
              >
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Gender</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                required
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Date of Birth</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={patientForm.date_of_birth}
                onChange={(e) => {
                  setPatientForm({ ...patientForm, date_of_birth: e.target.value });
                  e.target.blur();
                }}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Diagnosis</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={patientForm.diagnosis}
                onChange={(e) => setPatientForm({ ...patientForm, diagnosis: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Hospital</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={patientForm.hospital_name}
              onChange={(e) => setPatientForm({ ...patientForm, hospital_name: e.target.value })}
            />
          </div>
          {patientError && <div className="text-red-600 text-sm">{patientError}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setPatientForm(blankPatient);
                setPatientError('');
                setPatientModal(false);
              }}
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" type="submit">
              {patientForm.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
