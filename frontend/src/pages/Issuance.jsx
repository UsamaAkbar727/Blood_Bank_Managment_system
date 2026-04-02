import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchActiveIndex, setPatientSearchActiveIndex] = useState(-1);
  const patientSearchRef = useRef(null);
  const patientSearchInputRef = useRef(null);
  const [patientForm, setPatientForm] = useState(blankPatient);
  const [patientError, setPatientError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [patientModal, setPatientModal] = useState(false);
  const [issuanceModal, setIssuanceModal] = useState(false);
  const [pendingIssueUnit, setPendingIssueUnit] = useState(null);
  const [issuanceForm, setIssuanceForm] = useState({
    hospital_ward_name: '',
    authorized_by: '',
    issuance_type: 'Routine',
    price: '',
    payment_status: 'Paid',
    is_exchange: 'No',
    exchange_reference: '',
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
  const [priceCatalog, setPriceCatalog] = useState([]);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const quickActionsRef = useRef(null);

  const issuanceViews = [
    { key: 'add', label: 'Add Issuance' },
    { key: 'history', label: 'Issued History' },
    { key: 'reports', label: 'Issuance Reports' },
  ];

  const loadPatients = useCallback(async (q = '') => {
    setPatientSearchLoading(true);
    try {
      const res = await request(`/api/patients/index.php?q=${encodeURIComponent(q)}`);
      setPatients(res.data || []);
    } catch (err) {
      console.error('Failed to load patients', err);
      setPatients([]);
      setToast({ message: 'Unable to load patients.', type: 'error' });
    } finally {
      setPatientSearchLoading(false);
    }
  }, []);

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

  const loadPriceCatalog = useCallback(async () => {
    try {
      const res = await request('/api/finance/pricing.php');
      setPriceCatalog(res.data || []);
    } catch (err) {
      console.error('Failed to load pricing catalog', err);
      setPriceCatalog([]);
    }
  }, []);

  const resetPatientSelection = useCallback(() => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientSearchOpen(false);
    setPatientSearchActiveIndex(-1);
    setUnits([]);
    setPatientForm(blankPatient);
    setPatientError('');
    if (patientSearchInputRef.current) {
      patientSearchInputRef.current.value = '';
    }
  }, []);

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
    loadPriceCatalog();
    resetPatientSelection();
  }, [resetPatientSelection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch.trim());
    }, patientSearch.trim() ? 250 : 0);

    return () => clearTimeout(timer);
  }, [patientSearch, loadPatients]);

  useEffect(() => {
    if (activeView === 'history') {
      loadHistory();
    }
    if (activeView === 'reports') {
      loadReports(reportDays);
    }

    if (activeView === 'add') {
      resetPatientSelection();
    }
  }, [activeView, loadHistory, loadReports, reportDays, resetPatientSelection]);

  useEffect(() => {
    if (activeView !== 'reports' && quickActionsOpen) {
      setQuickActionsOpen(false);
    }
  }, [activeView, quickActionsOpen]);

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

  useEffect(() => {
    if (!issuanceModal || !pendingIssueUnit) return;
    const match = priceCatalog.find(
      (p) => p.component === pendingIssueUnit.component && p.blood_group === pendingIssueUnit.blood_group,
    );
    if (match && !issuanceForm.price) {
      setIssuanceForm((prev) => ({ ...prev, price: Number(match.unit_cost).toFixed(2) }));
    }
  }, [issuanceModal, pendingIssueUnit, priceCatalog, issuanceForm.price]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setQuickActionsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setQuickActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const suggestedPrice = useMemo(() => {
    if (!pendingIssueUnit) return '';
    const match = priceCatalog.find(
      (p) => p.component === pendingIssueUnit.component && p.blood_group === pendingIssueUnit.blood_group,
    );
    return match ? Number(match.unit_cost).toFixed(2) : '';
  }, [pendingIssueUnit, priceCatalog]);

  const selectedPatientName = selectedPatient?.full_name || 'N/A';

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
      hospital_ward_name: selectedPatient.hospital_name || '',
      authorized_by: '',
      issuance_type: 'Routine',
      price: '',
      payment_status: 'Paid',
      is_exchange: 'No',
      exchange_reference: '',
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
      price: issuanceForm.price === '' ? undefined : Number(issuanceForm.price),
      payment_status: issuanceForm.payment_status,
      is_exchange: issuanceForm.is_exchange === 'Yes',
      exchange_reference: issuanceForm.is_exchange === 'Yes' ? issuanceForm.exchange_reference : '',
      remarks: `Recipient: ${selectedPatientName}; Ward: ${issuanceForm.hospital_ward_name || selectedPatient.hospital_name || ''}; Authorized By: ${issuanceForm.authorized_by || ''}; Type: ${issuanceForm.issuance_type}`,
    };
    try {
      await request('/api/issuance/index.php', { method: 'POST', body: payload });
      await loadUnits(selectedPatient);
      setIssuanceModal(false);
      setPendingIssueUnit(null);
      setIssuanceForm({
        hospital_ward_name: '',
        authorized_by: '',
        issuance_type: 'Routine',
        price: '',
        payment_status: 'Paid',
        is_exchange: 'No',
        exchange_reference: '',
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
    () => patients.map((p) => ({ value: p.id, label: `${p.patient_code} - ${p.full_name} (${p.blood_group})`, blood: p.blood_group, patient: p })),
    [patients],
  );

  const visiblePatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patientOptions;

    const filtered = patientOptions.filter((opt, index) => {
      const patient = patients[index];
      const text = [
        opt.label,
        patient?.hospital_id,
        patient?.hospital_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
    if (selectedPatient && !filtered.some((opt) => String(opt.value) === String(selectedPatient.id))) {
      const selectedOption = patientOptions.find((opt) => String(opt.value) === String(selectedPatient.id));
      if (selectedOption) filtered.unshift(selectedOption);
    }
    return filtered;
  }, [patientOptions, patientSearch, patients]);

  const patientSearchEmpty = !patientSearchLoading && patientSearch.trim().length > 0 && visiblePatients.length === 0;

  const selectPatient = (option) => {
    setSelectedPatient(option.patient);
    setPatientSearch(option.label);
    setPatientSearchOpen(false);
    setPatientSearchActiveIndex(-1);
    loadUnits(option.patient);
  };

  const handlePatientSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' && visiblePatients.length > 0) {
      event.preventDefault();
      setPatientSearchOpen(true);
      setPatientSearchActiveIndex((current) => (current + 1) % visiblePatients.length);
      return;
    }
    if (event.key === 'ArrowUp' && visiblePatients.length > 0) {
      event.preventDefault();
      setPatientSearchOpen(true);
      setPatientSearchActiveIndex((current) => (current <= 0 ? visiblePatients.length - 1 : current - 1));
      return;
    }
    if (event.key === 'Enter' && patientSearchOpen && patientSearchActiveIndex >= 0) {
      event.preventDefault();
      const option = visiblePatients[patientSearchActiveIndex];
      if (option) selectPatient(option);
      return;
    }
    if (event.key === 'Escape') {
      setPatientSearchOpen(false);
      setPatientSearchActiveIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target)) {
        setPatientSearchOpen(false);
        setPatientSearchActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const reportSummary = useMemo(() => {
    const daily = reportData?.issuance_daily || [];
    return { totalIssued: daily.reduce((sum, row) => sum + Number(row.total || 0), 0) };
  }, [reportData]);

  const showIssuedHistoryAction = activeView !== 'history';
  const showQuickActions = activeView === 'reports';

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 gap-5">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 shadow-sm border border-slate-100 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Issuance</h2>
            <p className="text-sm text-slate-500">Manage new issuances, review past activity, and generate reports.</p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-2xl bg-white p-1 gap-1 self-start shadow-inner border border-slate-200">
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

            <div className="flex items-center gap-2 self-start lg:self-auto min-h-[44px]">
              <div className="w-[126px]">
                {showIssuedHistoryAction ? (
                  <button
                    type="button"
                    onClick={() => setActiveView('history')}
                    className={classNames(
                      'w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                      activeView === 'history'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-white text-slate-700',
                    )}
                  >
                    Issued History
                  </button>
                ) : (
                  <div aria-hidden="true" className="h-10" />
                )}
              </div>
              <div className="w-[140px]">
                {showQuickActions ? (
                  <div ref={quickActionsRef} className="relative">
                    <button
                      type="button"
                      aria-expanded={quickActionsOpen}
                      aria-haspopup="menu"
                      onClick={() => setQuickActionsOpen((open) => !open)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"
                    >
                      Quick Actions
                    </button>
                    {quickActionsOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-10"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('reports');
                            setQuickActionsOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Open Issuance Reports
                        </button>
                        <a
                          href={`/api/reports/export.php?days=${reportDays}&format=excel`}
                          onClick={() => setQuickActionsOpen(false)}
                          className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Export Excel Summary
                        </a>
                        <a
                          href={`/api/reports/export.php?days=${reportDays}&format=pdf`}
                          onClick={() => setQuickActionsOpen(false)}
                          className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Export PDF Summary
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div aria-hidden="true" className="h-10" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'add' && (
        <>
          <div className="card p-4 flex items-center justify-between gap-3 flex-wrap shadow-sm border border-slate-100">
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:min-w-[320px]" ref={patientSearchRef}>
                <input
                  type="text"
                  ref={patientSearchInputRef}
                  value={patientSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    const hasQuery = value.trim().length > 0;
                    setPatientSearch(value);
                    setPatientSearchOpen(true);
                    setPatientSearchActiveIndex(hasQuery ? 0 : -1);
                    if (!hasQuery && selectedPatient) {
                      setSelectedPatient(null);
                      setUnits([]);
                    }
                  }}
                  onFocus={() => {
                    setPatientSearchOpen(true);
                    setPatientSearchActiveIndex(patientSearch.trim().length > 0 ? 0 : -1);
                  }}
                  onKeyDown={handlePatientSearchKeyDown}
                  placeholder="Search by name, blood group, or hospital ID..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-24 focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-autocomplete="list"
                  aria-expanded={patientSearchOpen}
                  aria-controls="patient-search-list"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = patientSearch.trim();
                    if (!trimmed) {
                      loadPatients();
                      setPatientSearchOpen(true);
                      setPatientSearchActiveIndex(-1);
                    } else {
                      loadPatients(trimmed);
                      setPatientSearchOpen(true);
                    }
                  }}
                  className="absolute inset-y-1 right-1 flex items-center justify-center px-3 rounded-md border border-blue-200 bg-blue-50 text-[11px] font-bold uppercase tracking-wide text-blue-700 shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  {patientSearchLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
                {patientSearchOpen && (
                  <div
                    id="patient-search-list"
                    className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg"
                    role="listbox"
                  >
                    {patientSearchLoading ? (
                      <div className="p-4 text-slate-500">Searching...</div>
                    ) : visiblePatients.length > 0 ? (
                      visiblePatients.map((opt, index) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={patientSearchActiveIndex === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPatient(opt)}
                          onMouseEnter={() => setPatientSearchActiveIndex(index)}
                          className={classNames(
                            'w-full text-left px-4 py-3 border-b border-slate-100 transition-colors',
                            patientSearchActiveIndex === index ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          <div className="text-sm font-medium">{opt.label}</div>
                          {opt.patient.hospital_name && (
                            <div className="text-xs text-slate-500">{opt.patient.hospital_name}</div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-slate-500">No patients found</div>
                    )}
                  </div>
                )}
              </div>
              {patientSearchEmpty && (
                <div className="text-sm">
                  <button
                    type="button"
                    className="text-blue-700 hover:text-blue-800 font-medium underline underline-offset-2"
                    onClick={() => {
                      setPatientSearch('');
                      setPatientForm(blankPatient);
                      setPatientError('');
                      setPatientModal(true);
                    }}
                  >
                    No results found - Register New Patient
                  </button>
                </div>
              )}
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors self-start"
                onClick={() => {
                  setPatientForm(blankPatient);
                  setPatientError('');
                  setPatientModal(true);
                }}
              >
                Add New Patient
              </button>
            </div>
            {!selectedPatient && !patientSearchEmpty && (
              <div className="text-sm text-slate-500 italic">Please select a patient to view compatible units.</div>
            )}
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
              <p className="text-sm text-slate-500">Completed issuance records fetched from the IssuanceHistory API.</p>
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
            hospital_ward_name: '',
            authorized_by: '',
            issuance_type: 'Routine',
            price: '',
            payment_status: 'Paid',
            is_exchange: 'No',
            exchange_reference: '',
            verification_checked: false,
          });
        }}
        title="Confirm Blood Issuance"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Issuing to: <span className="text-slate-900 normal-case">{selectedPatientName}</span>
            </div>
          </div>

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
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Price
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.price}
                onChange={(e) => setIssuanceForm({ ...issuanceForm, price: e.target.value })}
                placeholder={suggestedPrice ? `Default ${suggestedPrice}` : 'Enter price'}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Payment Status
              </label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.payment_status}
                onChange={(e) => setIssuanceForm({ ...issuanceForm, payment_status: e.target.value })}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Free/Charity">Free/Charity</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Transaction Type
              </label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={issuanceForm.is_exchange}
                onChange={(e) =>
                  setIssuanceForm({
                    ...issuanceForm,
                    is_exchange: e.target.value,
                    exchange_reference: e.target.value === 'Yes' ? issuanceForm.exchange_reference : '',
                  })
                }
              >
                <option value="No">Fresh Purchase</option>
                <option value="Yes">Exchange (Donor Provided)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Select Exchange if a donor-provided bag or donor ID is being credited back into stock.
              </p>
            </div>
            {issuanceForm.is_exchange === 'Yes' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Donor ID or Bag ID
                </label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={issuanceForm.exchange_reference}
                  onChange={(e) => setIssuanceForm({ ...issuanceForm, exchange_reference: e.target.value })}
                  placeholder="Enter Donor ID or Bag ID"
                  required
                />
              </div>
            )}
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
            <div>Recipient: {selectedPatientName}</div>
            <div>Ward: {issuanceForm.hospital_ward_name || selectedPatient?.hospital_name || 'N/A'}</div>
            <div>Authorized by: {issuanceForm.authorized_by || 'N/A'}</div>
            <div>Type: {issuanceForm.issuance_type}</div>
            <div>Price: {issuanceForm.price || suggestedPrice || 'N/A'}</div>
            <div>Payment status: {issuanceForm.payment_status}</div>
            <div>Transaction type: {issuanceForm.is_exchange === 'Yes' ? 'Exchange (Donor Provided)' : 'Fresh Purchase'}</div>
            {issuanceForm.is_exchange === 'Yes' && <div>Exchange reference: {issuanceForm.exchange_reference || 'N/A'}</div>}
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
                hospital_ward_name: '',
                authorized_by: '',
                issuance_type: 'Routine',
                price: '',
                payment_status: 'Paid',
                is_exchange: 'No',
                exchange_reference: '',
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

