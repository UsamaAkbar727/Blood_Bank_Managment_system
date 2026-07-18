import React, { useEffect, useState, useMemo } from 'react';
import { CircleDollarSign, Plus } from 'lucide-react';
import { formatCurrency, request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { PageHeader, useScrollReveal } from '../components/UI';
import { LineChart, DoughnutChart } from '../components/Charts';

const blankPrice = {
  component: 'Whole Blood',
  blood_group: 'A+',
  unit_cost: '',
  effective_from: '',
};

const blankExpense = {
  category: '',
  amount: '',
  description: '',
  incurred_on: '',
};

export default function Finance({ section = 'pricing' }) {
  useScrollReveal();
  const [prices, setPrices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [priceForm, setPriceForm] = useState(blankPrice);
  const [expenseForm, setExpenseForm] = useState(blankExpense);
  const [priceError, setPriceError] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [priceModal, setPriceModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [reports, setReports] = useState(null);

  const loadPrices = async () => {
    const res = await request('/api/finance/pricing.php');
    setPrices(res.data || []);
  };

  const loadExpenses = async () => {
    const res = await request('/api/finance/expenses.php');
    setExpenses(res.data || []);
  };

  const loadReports = async () => {
    try {
      const res = await request('/api/reports/index.php?days=30');
      setReports(res || null);
    } catch (e) {
      console.error('Failed to load financial reports', e);
    }
  };

  useEffect(() => {
    loadPrices();
    loadExpenses();
    loadReports();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadPrices();
      loadExpenses();
      loadReports();
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    if (!reports?.financial_summary) return { totalIncome: 0, totalExpenses: 0 };
    const inc = (reports.financial_summary.income_trend || []).reduce((sum, row) => sum + Number(row.total || 0), 0);
    const exp = (reports.financial_summary.expense_trend || []).reduce((sum, row) => sum + Number(row.total || 0), 0);
    return { totalIncome: inc, totalExpenses: exp };
  }, [reports]);

  const lineData = useMemo(() => {
    if (!reports?.financial_summary) return { labels: [], income: [], expenses: [] };
    const incMap = {};
    const expMap = {};
    const daysSet = new Set();
    
    (reports.financial_summary.income_trend || []).forEach((row) => {
      incMap[row.day] = Number(row.total || 0);
      daysSet.add(row.day);
    });
    
    (reports.financial_summary.expense_trend || []).forEach((row) => {
      expMap[row.day] = Number(row.total || 0);
      daysSet.add(row.day);
    });
    
    const labels = Array.from(daysSet).sort();
    const income = labels.map((d) => incMap[d] || 0);
    const expenses = labels.map((d) => expMap[d] || 0);
    
    return { labels, income, expenses };
  }, [reports]);

  const breakdownData = useMemo(() => {
    if (!reports?.financial_summary) return { labels: [], values: [] };
    const list = reports.financial_summary.expense_breakdown || [];
    return {
      labels: list.map((i) => i.category || 'Other'),
      values: list.map((i) => Number(i.total || 0)),
    };
  }, [reports]);

  const savePrice = async (e) => {
    e.preventDefault();
    setPriceError('');
    try {
      await request('/api/finance/pricing.php', { method: 'POST', body: priceForm });
      setToast({ message: 'Pricing entry saved successfully.', type: 'success' });
      setPriceForm(blankPrice);
      setPriceModal(false);
      loadPrices();
    } catch (err) {
      setPriceError(err.message || 'Save failed');
    }
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    setExpenseError('');
    try {
      await request('/api/finance/expenses.php', { method: 'POST', body: expenseForm });
      setToast({ message: 'Expense saved successfully.', type: 'success' });
      setExpenseForm(blankExpense);
      setExpenseModal(false);
      loadExpenses();
    } catch (err) {
      setExpenseError(err.message || 'Save failed');
    }
  };

  const deleteExpense = async (id) => {
    try {
      await request(`/api/finance/expenses.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Expense removed successfully.', type: 'success' });
      loadExpenses();
    } catch (err) {
      setToast({ message: err.message || 'Unable to remove expense. Please try again.', type: 'error' });
    }
  };

  const deletePrice = async (id) => {
    try {
      await request(`/api/finance/pricing.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Pricing entry removed successfully.', type: 'success' });
      loadPrices();
    } catch (err) {
      setToast({ message: err.message || 'Unable to remove pricing entry. Please try again.', type: 'error' });
    }
  };



  return (
    <div className="space-y-5 page-stagger">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />

      <PageHeader
        icon={CircleDollarSign}
        title={section === 'pricing' ? 'Blood Unit Pricing' : 'Expenses'}
        subtitle={section === 'pricing' ? 'Configure per-unit blood component costs' : 'Track operational expenses'}
      />

      {section === 'pricing' && (
        <div className="card-3d p-5 no-animate">
          <div className="flex items-center justify-end mb-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setPriceForm(blankPrice);
                setPriceError('');
                setPriceModal(true);
              }}
            >
              <Plus size={16} />
              Add Price
            </button>
          </div>
          <div className="table-responsive overflow-x-auto mt-2">
            <table className="table-premium">
              <thead>
                <tr>
                  <th className="px-3 py-2">Component</th>
                  <th className="px-3 py-2">Blood</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Eff From</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.component}</td>
                    <td className="px-3 py-2">{r.blood_group}</td>
                    <td className="px-3 py-2">{formatCurrency(r.unit_cost)}</td>
                    <td className="px-3 py-2">{r.effective_from}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="btn-danger" onClick={() => deletePrice(r.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {prices.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-slate-500" colSpan={5}>
                      No pricing configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'expenses' && (
        <div className="space-y-5">
          {/* Visual trend charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card bg-gradient-to-br from-white to-emerald-50 text-slate-800" style={{ '--accent': '#059669' }}>
              <p className="text-sm font-semibold text-slate-500">Income (Last 30 Days)</p>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{formatCurrency(stats.totalIncome)}</div>
            </div>
            <div className="stat-card bg-gradient-to-br from-white to-red-50 text-slate-800" style={{ '--accent': '#dc2626' }}>
              <p className="text-sm font-semibold text-slate-500">Expenses (Last 30 Days)</p>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{formatCurrency(stats.totalExpenses)}</div>
            </div>
            <div className="stat-card bg-gradient-to-br from-white to-blue-50 text-slate-800" style={{ '--accent': '#2563eb' }}>
              <p className="text-sm font-semibold text-slate-500">Net Cash Flow</p>
              <div className={`mt-1 text-2xl font-extrabold ${stats.totalIncome - stats.totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(stats.totalIncome - stats.totalExpenses)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="card p-5 xl:col-span-2 shadow-sm border border-slate-100 bg-white rounded-2xl scroll-reveal">
              <h3 className="section-title mb-4">Cash Flow Analytics (Last 30 Days)</h3>
              <div className="h-56">
                <LineChart
                  labels={lineData.labels}
                  datasets={[
                    {
                      label: 'Income',
                      data: lineData.income,
                      borderColor: '#10b981',
                      backgroundColor: 'rgba(16,185,129,0.1)',
                      tension: 0.4,
                      fill: true,
                      pointRadius: 3,
                    },
                    {
                      label: 'Expenses',
                      data: lineData.expenses,
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      tension: 0.4,
                      fill: true,
                      pointRadius: 3,
                    },
                  ]}
                />
              </div>
            </div>

            <div className="card p-5 shadow-sm border border-slate-100 bg-white rounded-2xl scroll-reveal">
              <h3 className="section-title mb-4">Expense Categories Breakdown</h3>
              {breakdownData.values.length > 0 ? (
                <DoughnutChart labels={breakdownData.labels} values={breakdownData.values} />
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expenses recorded.</div>
              )}
            </div>
          </div>

          <div className="card-3d p-5 no-animate flex items-center justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setExpenseForm(blankExpense);
                setExpenseError('');
                setExpenseModal(true);
              }}
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>
          <div className="card-3d p-5 scroll-reveal">
            <div className="table-responsive overflow-x-auto">
              <table className="table-premium">
              <thead>
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((r, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-4 py-2">{r.incurred_on}</td>
                      <td className="px-4 py-2">{r.category}</td>
                      <td className="px-4 py-2">{r.description || ''}</td>
                      <td className="px-4 py-2">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-2 text-right">
                        <button className="btn-danger" onClick={() => deleteExpense(r.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td className="px-4 py-2 text-slate-500" colSpan={5}>
                        No expenses recorded
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
        open={priceModal}
        onClose={() => {
          setPriceModal(false);
          setPriceForm(blankPrice);
          setPriceError('');
        }}
        title="Add Price"
      >
        <form className="space-y-3" onSubmit={savePrice}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Component</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={priceForm.component}
                onChange={(e) => setPriceForm({ ...priceForm, component: e.target.value })}
              >
                {['Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Plasma', 'Cryo'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Blood Group</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={priceForm.blood_group}
                onChange={(e) => setPriceForm({ ...priceForm, blood_group: e.target.value })}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Unit Cost</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={priceForm.unit_cost}
                onChange={(e) => setPriceForm({ ...priceForm, unit_cost: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Effective From</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={priceForm.effective_from}
                onChange={(e) => {
                  setPriceForm({ ...priceForm, effective_from: e.target.value });
                  // e.target.blur();
                }}
              />
            </div>
          </div>
          {priceError && <div className="btn-danger">{priceError}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPriceForm(blankPrice);
                setPriceError('');
                setPriceModal(false);
              }}
            >
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={expenseModal}
        onClose={() => {
          setExpenseModal(false);
          setExpenseForm(blankExpense);
          setExpenseError('');
        }}
        title="Add Expense"
      >
        <form className="space-y-3" onSubmit={saveExpense}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Category</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Description</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Incurred On</label>
            <input
              type="date"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={expenseForm.incurred_on}
              onChange={(e) => {
                setExpenseForm({ ...expenseForm, incurred_on: e.target.value });
                // e.target.blur();
              }}
            />
          </div>
          {expenseError && <div className="btn-danger">{expenseError}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setExpenseForm(blankExpense);
                setExpenseError('');
                setExpenseModal(false);
              }}
            >
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
