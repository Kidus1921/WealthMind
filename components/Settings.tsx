
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Trash2, Plus, Moon, Sun, Wallet, AlertCircle, AlertTriangle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    theme, toggleTheme, 
    currency, setCurrency,
    categories, addCategory, deleteCategory,
    paymentMethods, addPaymentMethod, deletePaymentMethod,
    resetData
  } = useApp();

  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<{type: 'income'|'expense', name: string} | null>(null);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAddCategory = (type: 'income' | 'expense') => {
    const val = type === 'income' ? newIncomeCat : newExpenseCat;
    if (val.trim()) {
      addCategory(type, val);
      if (type === 'income') setNewIncomeCat('');
      else setNewExpenseCat('');
    }
  };

  const handleConfirmDeleteCategory = () => {
    if (confirmDeleteCategory) {
      deleteCategory(confirmDeleteCategory.type, confirmDeleteCategory.name);
      setConfirmDeleteCategory(null);
    }
  };

  const handleConfirmDeletePayment = () => {
    if (confirmDeletePayment) {
      deletePaymentMethod(confirmDeletePayment);
      setConfirmDeletePayment(null);
    }
  };

  const handleAddPayment = () => {
    if (newPaymentMethod.trim()) {
      addPaymentMethod(newPaymentMethod);
      setNewPaymentMethod('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50"><h3 className="font-semibold text-gray-800 dark:text-white">General Preferences</h3></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Appearance</label>
            <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
              <button onClick={() => theme === 'dark' && toggleTheme()} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'light' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Sun size={16} /> Light</button>
              <button onClick={() => theme === 'light' && toggleTheme()} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'dark' ? 'bg-slate-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Moon size={16} /> Dark</button>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency Symbol</label>
            <div className="flex gap-2">
              {['$', '€', '£', '¥', '₹'].map(c => (
                <button key={c} onClick={() => setCurrency(c)} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${currency === c ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50"><h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Expense Categories</h3></div>
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input type="text" placeholder="New Category..." value={newExpenseCat} onChange={e => setNewExpenseCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory('expense')} className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" />
              <button onClick={() => handleAddCategory('expense')} className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"><Plus size={20} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.expense.map(cat => (
              <div key={cat} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><span className="text-gray-700 dark:text-gray-300">{cat}</span><button onClick={() => setConfirmDeleteCategory({type: 'expense', name: cat})} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50"><h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Income Categories</h3></div>
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input type="text" placeholder="New Category..." value={newIncomeCat} onChange={e => setNewIncomeCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory('income')} className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
              <button onClick={() => handleAddCategory('income')} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Plus size={20} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.income.map(cat => (
              <div key={cat} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"><span className="text-gray-700 dark:text-gray-300">{cat}</span><button onClick={() => setConfirmDeleteCategory({type: 'income', name: cat})} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div>
            ))}
          </div>
        </div>
      </div>
      {(confirmDeleteCategory || confirmDeletePayment || confirmReset) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            {confirmDeleteCategory && (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Category?</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Are you sure you want to delete the category "{confirmDeleteCategory.name}"?</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDeleteCategory(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 rounded-xl">Cancel</button>
                  <button onClick={handleConfirmDeleteCategory} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
