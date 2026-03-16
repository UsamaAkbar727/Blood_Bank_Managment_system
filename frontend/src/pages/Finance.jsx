import React, { useEffect, useState } from 'react';
import { formatCurrency, request } from '../lib/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

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
  const [prices, setPrices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [priceForm, setPriceForm] = useState(blankPrice);
  const [expenseForm, setExpenseForm] = useState(blankExpense);
  const [priceError, setPriceError] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [priceModal, setPriceModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const loadPrices = async () => {
    const res = await request('/api/finance/pricing.php');
    setPrices(res.data || []);
  };

  const loadExpenses = async () => {
    const res = await request('/api/finance/expenses.php');
    setExpenses(res.data || []);
  };

  useEffect(() => {
    loadPrices();
    loadExpenses();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadPrices();
      loadExpenses();
    }, 15000);
    return () => clearInterval(id);
  }, []);

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
    <div className="space-y-3">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />

      {section === 'pricing' && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Blood Unit Pricing</h3>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
              onClick={() => {
                setPriceForm(blankPrice);
                setPriceError('');
                setPriceModal(true);
              }}
            >
              Add Price
            </button>
          </div>
          <div className="table-responsive overflow-x-auto mt-2">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
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
                    <td className="px-3 py-2">{Number(r.unit_cost).toFixed(2)}</td>
                    <td className="px-3 py-2">{r.effective_from}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="text-red-600 text-sm" onClick={() => deletePrice(r.id)}>
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
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Expenses</h3>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
              onClick={() => {
                setExpenseForm(blankExpense);
                setExpenseError('');
                setExpenseModal(true);
              }}
            >
              Add Expense
            </button>
          </div>
          <div className="card p-4">
            <div className="table-responsive overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left">
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
                        <button className="text-red-600 text-sm" onClick={() => deleteExpense(r.id)}>
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
                  e.target.blur();
                }}
              />
            </div>
          </div>
          {priceError && <div className="text-red-600 text-sm">{priceError}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setPriceForm(blankPrice);
                setPriceError('');
                setPriceModal(false);
              }}
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" type="submit">
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
          <div className="grid grid-cols-2 gap-3">
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
                e.target.blur();
              }}
            />
          </div>
          {expenseError && <div className="text-red-600 text-sm">{expenseError}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setExpenseForm(blankExpense);
                setExpenseError('');
                setExpenseModal(false);
              }}
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" type="submit">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
