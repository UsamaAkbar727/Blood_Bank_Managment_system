import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { classNames, request } from '../lib/api';

const TEST_FIELDS = [
  { key: 'hiv', label: 'HIV' },
  { key: 'hbsag', label: 'Hepatitis B (HBS)' },
  { key: 'hcv', label: 'Hepatitis C (HCV)' },
  { key: 'malaria', label: 'Malaria' },
  { key: 'syphilis', label: 'Syphilis' },
];

const blankForm = {
  id: null,
  collection_id: '',
  test_date: '',
  blood_group_confirmed: '',
  hemoglobin_level: '',
  result_status: 'pending',
  remarks: '',
  hiv: false,
  hbsag: false,
  hcv: false,
  malaria: false,
  syphilis: false,
};

function formatDateTimeLocal(value) {
  return value ? String(value).slice(0, 16).replace(' ', 'T') : '';
}

function statusTone(status) {
  if (status === 'safe') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

export default function Screening() {
  const [rows, setRows] = useState([]);
  const [collections, setCollections] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blankForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const isDiseasePanelDisabled = form.result_status !== 'rejected';

  const load = useCallback(
    async (q = search) => {
      setLoading(true);
      try {
        const [screeningRes, collectionsRes] = await Promise.all([
          request(`/api/screening/index.php?q=${encodeURIComponent(q)}`),
          request(`/api/screening/index.php?collections=1`), // Load ALL collections without search filter
        ]);
        setRows(screeningRes.data || []);
        setCollections(collectionsRes.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load screening data.');
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
    if (form.result_status === 'rejected') return;
    if (form.hiv || form.hbsag || form.hcv || form.malaria || form.syphilis) {
      setForm((current) => ({
        ...current,
        hiv: false,
        hbsag: false,
        hcv: false,
        malaria: false,
        syphilis: false,
      }));
    }
  }, [form.result_status, form.hiv, form.hbsag, form.hcv, form.malaria, form.syphilis]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.result_status] = (acc[row.result_status] || 0) + 1;
        return acc;
      },
      { total: 0, safe: 0, rejected: 0, pending: 0 },
    );
  }, [rows]);

  const selectedCollection = useMemo(
    () => collections.find((item) => String(item.id) === String(form.collection_id)),
    [collections, form.collection_id],
  );

  const openCreate = () => {
    setForm({
      ...blankForm,
      test_date: formatDateTimeLocal(new Date().toISOString()),
    });
    setError('');
    setOpen(true);
  };

  const handleDateTimePicker = (event, field) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));

    if (value) {
      window.setTimeout(() => {
        if (document.activeElement === event.target) {
          event.target.blur();
        }
      }, 120);
    }
  };

  const edit = async (id) => {
    try {
      const res = await request(`/api/screening/index.php?id=${id}`);
      const row = res.data;
      if (!row) return;
      setForm({
        id: row.id,
        collection_id: String(row.collection_id),
        test_date: formatDateTimeLocal(row.test_date),
        blood_group_confirmed: row.blood_group_confirmed || '',
        hemoglobin_level: row.hemoglobin_level ?? '',
        result_status: row.result_status || 'pending',
        remarks: row.remarks || '',
        hiv: Boolean(Number(row.hiv)),
        hbsag: Boolean(Number(row.hbsag)),
        hcv: Boolean(Number(row.hcv)),
        malaria: Boolean(Number(row.malaria)),
        syphilis: Boolean(Number(row.syphilis)),
      });
      setError('');
      setOpen(true);
    } catch (err) {
      setToast({ message: err.message || 'Unable to load screening record.', type: 'error' });
    }
  };

  const remove = async (id) => {
    try {
      await request(`/api/screening/index.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Screening record deleted.', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message || 'Unable to delete screening record.', type: 'error' });
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      collection_id: Number(form.collection_id),
      test_date: form.test_date.replace('T', ' '),
      hemoglobin_level: form.hemoglobin_level === '' ? null : Number(form.hemoglobin_level),
      result_status: form.result_status,
      remarks: form.remarks,
      hiv: form.hiv ? 1 : 0,
      hbsag: form.hbsag ? 1 : 0,
      hcv: form.hcv ? 1 : 0,
      malaria: form.malaria ? 1 : 0,
      syphilis: form.syphilis ? 1 : 0,
    };

    try {
      const method = form.id ? 'PUT' : 'POST';
      const url = form.id ? `/api/screening/index.php?id=${form.id}` : '/api/screening/index.php';
      await request(url, { method, body: payload });
      setToast({
        message: form.id ? 'Screening record updated.' : 'Screening record created.',
        type: 'success',
      });
      setOpen(false);
      setForm(blankForm);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save screening record.');
    }
  };

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />

      <section className="grid gap-3 md:grid-cols-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total Records</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Safe Units</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-700">{summary.safe}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Rejected Units</div>
          <div className="mt-2 text-2xl font-semibold text-rose-700">{summary.rejected}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Pending Review</div>
          <div className="mt-2 text-2xl font-semibold text-amber-700">{summary.pending}</div>
        </div>
      </section>

      <section className="card p-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Result History</h2>
          <p className="text-sm text-slate-500">Track screening status, disease flags, and confirmed blood groups.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              load(event.target.value);
            }}
            placeholder="Search by collection, donor, or status"
            className="w-full md:w-80 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={collections.length === 0}
            title={collections.length === 0 ? 'No pending collections available. Create a collection first.' : ''}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              collections.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={openCreate}
          >
            Add Screening Record
          </button>
        </div>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="table-responsive overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Donor</th>
                <th className="px-4 py-3">Confirmed Group</th>
                <th className="px-4 py-3">Reactive Tests</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Test Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const reactive = TEST_FIELDS.filter((field) => Number(row[field.key])).map((field) => field.label);
                return (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{row.collection_code}</div>
                      <div className="text-xs text-slate-500">{row.collection_status}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.donor_name}</div>
                      <div className="text-xs text-slate-500">Donor Group: {row.donor_blood}</div>
                    </td>
                    <td className="px-4 py-3">{row.blood_group_confirmed}</td>
                    <td className="px-4 py-3">
                      {reactive.length ? reactive.join(', ') : <span className="text-emerald-700">All non-reactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={classNames('px-2.5 py-1 rounded-full text-xs font-medium', statusTone(row.result_status))}>
                        {row.result_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.test_date}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button className="text-blue-600 text-sm" onClick={() => edit(row.id)}>
                        Edit
                      </button>
                      <button className="text-red-600 text-sm" onClick={() => remove(row.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={7}>
                    No screening records found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setForm(blankForm);
          setError('');
        }}
        title={form.id ? 'Edit Screening Record' : 'Add Screening Record'}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          {collections.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
              No collections available for screening. Please create a collection and add donors first.
            </div>
          )}
          <div>
            <label className="text-sm text-slate-600">Collection Unit</label>
            <select
              className={classNames(
                'mt-1 w-full border border-slate-200 rounded-lg px-3 py-2',
                form.id ? 'appearance-none bg-slate-50 text-slate-600 cursor-not-allowed' : '',
              )}
              value={form.collection_id}
              onChange={(event) => {
                const nextCollectionId = event.target.value;
                const nextCollection = collections.find((item) => String(item.id) === nextCollectionId);
                setForm((current) => ({
                  ...current,
                  collection_id: nextCollectionId,
                  blood_group_confirmed: current.id
                    ? current.blood_group_confirmed
                    : nextCollection?.blood_group || current.blood_group_confirmed,
                }));
              }}
              required
              disabled={Boolean(form.id)}
            >
              <option value="">Select collection</option>
              {collections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.collection_code} | {item.donor_name} | {item.blood_group}
                </option>
              ))}
            </select>
            {selectedCollection && (
              <p className="mt-1 text-xs text-slate-500">
                {selectedCollection.volume_ml} ml collected on {selectedCollection.collection_date}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Test Date & Time</label>
              <input
                type="datetime-local"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.test_date}
                onChange={(event) => handleDateTimePicker(event, 'test_date')}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Confirmed Blood Group</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700"
                value={form.blood_group_confirmed || selectedCollection?.blood_group || ''}
                readOnly
                required
              />
              <p className="mt-1 text-xs text-slate-500">Pulled from the donor/collection record.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Hemoglobin (g/dL)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.hemoglobin_level}
                onChange={(event) => setForm({ ...form, hemoglobin_level: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Manual Status</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={form.result_status}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  setForm((current) => ({
                    ...current,
                    result_status: nextStatus,
                    ...(nextStatus === 'rejected'
                      ? {}
                      : {
                          hiv: false,
                          hbsag: false,
                          hcv: false,
                          malaria: false,
                          syphilis: false,
                        }),
                  }));
                }}
              >
                <option value="pending">Pending</option>
                <option value="safe">Safe</option>
                <option value="rejected">Rejected</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Any reactive disease flag will automatically mark the unit as rejected.</p>
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-600 mb-2">Disease Screening Panel</div>
            <div className="grid md:grid-cols-2 gap-3">
              {TEST_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className={classNames(
                    'flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2',
                    isDiseasePanelDisabled ? 'bg-slate-50 text-slate-400' : '',
                  )}
                >
                  <span className={classNames('text-sm', isDiseasePanelDisabled ? 'text-slate-400' : 'text-slate-700')}>
                    {field.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={form[field.key]}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.checked })}
                    disabled={isDiseasePanelDisabled}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">Remarks</label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              rows={3}
              value={form.remarks}
              onChange={(event) => setForm({ ...form, remarks: event.target.value })}
              placeholder="Optional observations or handling notes"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setOpen(false);
                setForm(blankForm);
                setError('');
              }}
            >
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              {form.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
