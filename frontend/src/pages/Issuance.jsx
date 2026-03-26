import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { classNames, request } from '../lib/api';
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
  const compact = base.replace(/\s+/g, '').replace(/[–—]/g, '-');
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
  const [patientModal, setPatientModal] = useState(false);
  const [issuanceModal, setIssuanceModal] = useState(false);
  const [pendingIssueUnit, setPendingIssueUnit] = useState(null);
  const [issuanceForm, setIssuanceForm] = useState({
    recipient_name: '',
    hospital_ward_name: '',
    authorized_by: '',
    issuance_type: 'Routine',
    verification_checked: false,
  });
  const [issuing, setIssuing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [activeView, setActiveView] = useState('add');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reportDays, setReportDays] = useState(30);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const issuanceViews = [
    { key: 'add', label: 'Add Issuance' },
    { key: 'history', label: 'Issued History' },
    { key: 'reports', label: 'Issuance Reports' },
  ];

  const loadPatients = async (q = '') => {
    const res = await request(`/api/patients/index.php?q=${encodeURIComponent(q)}`);
    setPatients(res.data || []);
  };

  const loadHistory = useCallback(async (patientId = null) => {
    setHistoryLoading(true);
    try {
      const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const res = await request(`/api/issuance/history.php${query}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load issuance history', err);
      setToast({ message: 'Unable to load issuance history.', type: 'error' });
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadReports = useCallback(async (days = reportDays) => {
    setReportLoading(true);
    try {
      const res = await request(`/api/reports/index.php?days=${days}`);
      setReportData(res);
    } catch (err) {
      console.error('Failed to load issuance reports', err);
      setToast({ message: 'Unable to load issuance reports.', type: 'error' });
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  }, [reportDays]);

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
      setToast({ message: 'Error loading compatible units. Please check your connection.', type: 'error' });
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (activeView === 'history') {
      loadHistory();
    }
    if (activeView === 'reports') {
      loadReports(reportDays);
    }
  }, [activeView, loadHistory, loadReports, reportDays]);

  useEffect(() => {
    if (!selectedPatient) {
      setUnits([]);
      return;
    }
    loadUnits(selectedPatient);
    const id = setInterval(() => {
      loadUnits(selectedPatient);
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
      setToast({ message: isEdit ? 'Patient updated successfully.' : 'Patient added successfully.', type: 'success' });
      setPatientForm(blankPatient);
      setPatientModal(false);
      loadPatients();
    } catch (err) {
      setPatientError(err.message || 'Save failed');
    }
  };

  const openIssueModal = (unit) => {
    if (!selectedPatient) {
      setToast({ message: 'Please select a patient before issuing.', type: 'warning' });
      return;
    }
    setPendingIssueUnit(unit);
    setIssuanceForm({
      recipient_name: selectedPatient.full_name || '',
      hospital_ward_name: selectedPatient.hospital_name || '',
      authorized_by: '',
      issuance_type: 'Routine',
      verification_checked: false,
    });
    setIssuanceModal(true);
  };

  const confirmIssueUnit = async () => {
    if (!pendingIssueUnit || !selectedPatient) {
      setToast({ message: 'Please select a patient before issuing.', type: 'warning' });
      return;
    }
    if (!issuanceForm.verification_checked) {
      setToast({ message: 'Verification is required before issuing.', type: 'warning' });
      return;
    }
    setIssuing(true);
    const payload = {
      inventory_id: pendingIssueUnit.id,
      patient_id: selectedPatient.id,
      units_issued: 1,
      crossmatch_result: 'compatible',
      remarks: `Recipient: ${issuanceForm.recipient_name || selectedPatient.full_name}; Ward: ${issuanceForm.hospital_ward_name || selectedPatient.hospital_name || ''}; Authorized By: ${issuanceForm.authorized_by || ''}; Type: ${issuanceForm.issuance_type}`,
    };
    try {
      await request('/api/issuance/index.php', { method: 'POST', body: payload });
      await loadUnits(selectedPatient);
      setIssuanceModal(false);
      setPendingIssueUnit(null);
      setIssuanceForm({
        recipient_name: '',
        hospital_ward_name: '',
        authorized_by: '',
        issuance_type: 'Routine',
        verification_checked: false,
      });
      setToast({ message: 'Unit issued successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Unable to issue unit. Please try again.', type: 'error' });
    } finally {
      setIssuing(false);
    }
  };

  const patientOptions = useMemo(
    () => patients.map((p) => ({ value: p.id, label: `${p.patient_code} - ${p.full_name} (${p.blood_group})`, blood: p.blood_group })),
    [patients],
  );

  const reportSummary = useMemo(() => {
    const daily = reportData?.issuance_daily || [];
    return { totalIssued: daily.reduce((sum, row) => sum + Number(row.total || 0), 0) };
  }, [reportData]);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 gap-5">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 shadow-sm border border-slate-100 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Issuance</h2>
            <p className="text-sm text-slate-500">Manage new issuances, review past activity, and generate reports.</p>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1 gap-1 self-start shadow-inner">
              {issuanceViews.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveView(item.key)}
                  className={classNames(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    activeView === item.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setActiveView('history')}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700"
              >
                View History
              </button>
              <details className="relative">
                <summary className="list-none cursor-pointer px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
                  Quick Actions
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-10">
                  <button
                    type="button"
                    onClick={() => setActiveView('reports')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Open Issuance Reports
                  </button>
                  <a
                    href={`/api/reports/export.php?days=${reportDays}&format=excel`}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Export Excel Summary
                  </a>
                  <a
                    href={`/api/reports/export.php?days=${reportDays}&format=pdf`}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Export PDF Summary
                  </a>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'add' && (
        <>
          <div className="card p-4 flex items-center justify-between gap-3 flex-wrap shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className="border border-slate-200 rounded-lg px-4 py-2 w-full sm:min-w-[300px] sm:w-auto focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedPatient?.id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const p = patients.find((x) => String(x.id) === String(selectedId));
                  setSelectedPatient(p || null);
                  if (p) {
                    loadUnits(p);
                  } else {
                    setUnits([]);
                  }
                }}
              >
                <option value="">Select patient to issue blood...</option>
                {patientOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => {
                  setPatientForm(blankPatient);
                  setPatientError('');
                  setPatientModal(true);
                }}
              >
                Add New Patient
              </button>
            </div>
            {!selectedPatient && <div className="text-sm text-slate-500 italic">Please select a patient to view compatible units.</div>}
          </div>

          <div className="card p-0 overflow-hidden shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Compatible Available Units (FIFO)</h3>
              {selectedPatient && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target Patient:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                    {selectedPatient.full_name} ({normalizeBloodGroup(selectedPatient.blood_group)})
                  </span>
                </div>
              )}
            </div>
            <div className="table-responsive overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left">
                  <tr>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Unit Code</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Component Type</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Blood Group</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Expiry Date</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{u.collection_code}</td>
                      <td className="px-6 py-4 text-slate-600">{u.component}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                          {u.blood_group}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{u.expiry_date}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-md text-xs font-bold transition-all"
                          onClick={() => openIssueModal(u)}
                        >
                          Issue Unit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loadingUnits ? (
                    <tr>
                      <td className="px-6 py-10 text-center text-slate-400" colSpan={5}>
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                          <span>Finding compatible units...</span>
                        </div>
                      </td>
                    </tr>
                  ) : units.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-400" colSpan={5}>
                        <div className="flex flex-col items-center gap-1 opacity-60">
                          {selectedPatient ? (
                            <>
                              <div className="text-lg">📦</div>
                              <p>No compatible blood units found in inventory.</p>
                            </>
                          ) : (
                            <>
                              <div className="text-lg">👤</div>
                              <p>Select a patient above to see available compatible units.</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeView === 'history' && (
        <div className="card p-0 overflow-hidden shadow-sm border border-slate-100">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Issued History</h3>
              <p className="text-sm text-slate-500">Completed issuance records fetched from the `IssuanceHistory` API.</p>
            </div>
            <button
              type="button"
              onClick={() => loadHistory()}
              className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Refresh
            </button>
          </div>
          <div className="table-responsive overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Issue Date</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Patient</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Unit</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Blood Group</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{row.issue_date}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {row.patient_name || row.full_name || 'N/A'}
                      <div className="text-xs text-slate-500">{row.patient_code || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.collection_code || row.inventory_id}</td>
                    <td className="px-6 py-4 text-slate-600">{row.blood_group || row.patient_blood || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                        {row.status || 'issued'}
                      </span>
                    </td>
                  </tr>
                ))}
                {historyLoading ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-400" colSpan={5}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                        <span>Loading issuance history...</span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400" colSpan={5}>
                      No completed issuance records yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'reports' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="card p-4 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">Issuance Reports</h3>
                <p className="text-sm text-slate-500">Generate quick summaries or download report exports.</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={reportDays}
                  onChange={(e) => setReportDays(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  type="button"
                  onClick={() => loadReports(reportDays)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-700"
                >
                  Refresh
                </button>
                <a
                  href={`/api/reports/export.php?days=${reportDays}&format=excel`}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Export Excel
                </a>
                <a
                  href={`/api/reports/export.php?days=${reportDays}&format=pdf`}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm"
                >
                  Export PDF
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 shadow-sm border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Issuances in range</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{reportSummary.totalIssued}</div>
            </div>
            <div className="card p-4 shadow-sm border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Report window</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{reportDays} days</div>
            </div>
            <div className="card p-4 shadow-sm border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">View mode</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">Summary</div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Issuance by Day</h3>
              {reportLoading && <span className="text-sm text-slate-500">Loading...</span>}
            </div>
            <div className="table-responsive overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left">
                  <tr>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Total Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData?.issuance_daily || []).map((row) => (
                    <tr key={row.day} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-700">{row.day}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">{row.total}</td>
                    </tr>
                  ))}
                  {!reportLoading && (reportData?.issuance_daily || []).length === 0 && (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-400" colSpan={2}>
                        No issuance data available for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={patientModal}
        onClose={() => {
          setPatientModal(false);
          setPatientForm(blankPatient);
          setPatientError('');
        }}
        title={patientForm.id ? 'Edit Patient Details' : 'Register New Patient'}
      >
        <form className="p-1 space-y-4" onSubmit={savePatient}>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={patientForm.full_name}
              placeholder="e.g. John Doe"
              onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Blood Group</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={patientForm.blood_group}
                onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                required
              >
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Gender</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={patientForm.date_of_birth}
                onChange={(e) => {
                  setPatientForm({ ...patientForm, date_of_birth: e.target.value });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Diagnosis</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={patientForm.diagnosis}
                placeholder="Medical reason"
                onChange={(e) => setPatientForm({ ...patientForm, diagnosis: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Hospital / Ward</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={patientForm.hospital_name}
              placeholder="e.g. General Hospital Ward 4"
              onChange={(e) => setPatientForm({ ...patientForm, hospital_name: e.target.value })}
            />
          </div>
          {patientError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">{patientError}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              onClick={() => {
                setPatientForm(blankPatient);
                setPatientError('');
                setPatientModal(false);
              }}
            >
              Cancel
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5"
              type="submit"
            >
              {patientForm.id ? 'Update Patient' : 'Save Patient'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={issuanceModal}
        onClose={() => {
          if (issuing) return;
          setIssuanceModal(false);
          setPendingIssueUnit(null);
          setIssuanceForm({
            recipient_name: '',
            hospital_ward_name: '',
            authorized_by: '',
            issuance_type: 'Routine',
            verification_checked: false,
          });
        }}
        title="Confirm Blood Issuance"
      >
        <div className="space-y-4">
          {pendingIssueUnit && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-1">Point of No Return</div>
              <p className="text-sm text-slate-700">
                You are issuing Bag: <span className="font-bold text-slate-900">{pendingIssueUnit.collection_code}</span> (
                <span className="font-bold text-slate-900">{pendingIssueUnit.blood_group}</span>)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Recipient / Patient Name
              </label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.recipient_name}
                onChange={(e) => setIssuanceForm({ ...issuanceForm, recipient_name: e.target.value })}
                placeholder="Enter or confirm patient name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Hospital / Ward Name
              </label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.hospital_ward_name}
                onChange={(e) => setIssuanceForm({ ...issuanceForm, hospital_ward_name: e.target.value })}
                placeholder="Ward or hospital location"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Authorized By
              </label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.authorized_by}
                onChange={(e) => setIssuanceForm({ ...issuanceForm, authorized_by: e.target.value })}
                placeholder="Staff name or ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Issuance Type
              </label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.issuance_type}
                onChange={(e) => setIssuanceForm({ ...issuanceForm, issuance_type: e.target.value })}
              >
                <option value="Emergency">Emergency</option>
                <option value="Routine">Routine</option>
                <option value="Cross-match">Cross-match</option>
              </select>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={issuanceForm.verification_checked}
              onChange={(e) => setIssuanceForm({ ...issuanceForm, verification_checked: e.target.checked })}
            />
            <span className="text-sm text-slate-700">
              I have verified the Bag ID and Blood Group match the recipient.
            </span>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-800 mb-1">Final confirmation</div>
            <div>Recipient: {issuanceForm.recipient_name || selectedPatient?.full_name || 'N/A'}</div>
            <div>Ward: {issuanceForm.hospital_ward_name || selectedPatient?.hospital_name || 'N/A'}</div>
            <div>Authorized by: {issuanceForm.authorized_by || 'N/A'}</div>
            <div>Type: {issuanceForm.issuance_type}</div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            onClick={() => {
              if (issuing) return;
              setIssuanceModal(false);
              setPendingIssueUnit(null);
              setIssuanceForm({
                recipient_name: '',
                hospital_ward_name: '',
                authorized_by: '',
                issuance_type: 'Routine',
                verification_checked: false,
              });
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!issuanceForm.verification_checked || issuing}
            onClick={confirmIssueUnit}
            className={classNames(
              'px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-all',
              !issuanceForm.verification_checked || issuing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:-translate-y-0.5',
            )}
          >
            {issuing ? 'Issuing...' : 'Confirm & Issue'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
