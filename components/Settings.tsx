
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, Plus, Moon, Sun, Wallet, AlertCircle } from 'lucide-react';

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

  const handleAddCategory = (type: 'income' | 'expense') => {
    const val = type === 'income' ? newIncomeCat : newExpenseCat;
    if (val.trim()) {
      // Check for duplicates
      if (categories[type].includes(val.trim())) {
        alert('Category already exists!');
        return;
      }
      addCategory(type, val);
      if (type === 'income') setNewIncomeCat('');
      else setNewExpenseCat('');
    }
  };

  const handleDeleteCategory = (e: React.MouseEvent, type: 'income' | 'expense', name: string) => {
    e.stopPropagation(); // Prevent bubbling
    if (window.confirm(`Are you sure you want to delete the category "${name}"?`)) {
      deleteCategory(type, name);
    }
  };

  const handleAddPayment = () => {
    if (newPaymentMethod.trim()) {
      if (paymentMethods.includes(newPaymentMethod.trim())) {
        alert('Payment method already exists!');
        return;
      }
      addPaymentMethod(newPaymentMethod);
      setNewPaymentMethod('');
    }
  };

  const handleDeletePayment = (e: React.MouseEvent, name: string) => {
    e.stopPropagation(); // Prevent bubbling
    if (window.confirm(`Are you sure you want to delete payment method "${name}"?`)) {
      deletePaymentMethod(name);
    }
  };

  const handleReset = () => {
    if (window.confirm('WARNING: This will delete ALL transactions and reset settings to default. This action cannot be undone. Are you sure?')) {
      resetData();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>

      {/* General Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          <h3 className="font-semibold text-gray-800 dark:text-white">General Preferences</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Appearance</label>
            <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'light' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Sun size={16} /> Light
              </button>
              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-600 text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-200 dark:hover:text-gray-100'
                }`}
              >
                <Moon size={16} /> Dark
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency Symbol</label>
            <div className="flex gap-2">
              {['$', '€', '£', '¥', '₹'].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                    currency === c 
                      ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Expense Categories
            </h3>
          </div>
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New Category..."
                value={newExpenseCat}
                onChange={e => setNewExpenseCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory('expense')}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <button 
                onClick={() => handleAddCategory('expense')}
                className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.expense.map(cat => (
              <div key={cat} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                <button 
                  onClick={(e) => handleDeleteCategory(e, 'expense', cat)}
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors z-10 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {categories.expense.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">No expense categories.</p>
            )}
          </div>
        </div>

        {/* Income Categories */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Income Categories
            </h3>
          </div>
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New Category..."
                value={newIncomeCat}
                onChange={e => setNewIncomeCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory('income')}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button 
                onClick={() => handleAddCategory('income')}
                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.income.map(cat => (
              <div key={cat} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                <button 
                  onClick={(e) => handleDeleteCategory(e, 'income', cat)}
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors z-10 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {categories.income.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">No income categories.</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Wallet size={18} className="text-primary" />
            Payment Methods
          </h3>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6 max-w-md">
            <input
              type="text"
              placeholder="New Payment Method..."
              value={newPaymentMethod}
              onChange={e => setNewPaymentMethod(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPayment()}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
            />
            <button 
              onClick={handleAddPayment}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paymentMethods.map(method => (
              <div key={method} className="group relative flex items-center p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 hover:shadow-md transition-all">
                <span className="font-medium text-gray-800 dark:text-gray-200 pr-8 break-words">{method}</span>
                <button 
                  onClick={(e) => handleDeletePayment(e, method)}
                  className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-rose-500 rounded-md transition-colors z-10 cursor-pointer bg-transparent hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {paymentMethods.length === 0 && (
                <p className="text-gray-400 text-sm col-span-full">No payment methods added.</p>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone / Data Management */}
      <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl shadow-sm border border-rose-100 dark:border-rose-900/30 overflow-hidden">
        <div className="p-4 border-b border-rose-100 dark:border-rose-900/30 flex items-center gap-2 text-rose-700 dark:text-rose-400">
           <AlertCircle size={20} />
           <h3 className="font-semibold">Data Management</h3>
        </div>
        <div className="p-6">
           <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
             If you want to start fresh, you can clear all your transactions and reset settings to their defaults.
           </p>
           <button 
             onClick={handleReset}
             className="px-4 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 font-medium transition-colors shadow-sm"
           >
             Reset All Data
           </button>
        </div>
      </div>
    </div>
  );
};
