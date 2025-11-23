import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { autoCategorizeTransaction } from '../services/geminiService';
import { useApp } from '../context/AppContext';
import { Sparkles, Loader2, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  editTransaction?: Transaction;
}

export const TransactionForm: React.FC<Props> = ({ onClose, editTransaction }) => {
  const { addTransaction, updateTransaction, categories, paymentMethods } = useApp();
  const [loadingAi, setLoadingAi] = useState(false);

  const [formData, setFormData] = useState<Partial<Transaction>>(
    editTransaction || {
      amount: 0,
      type: 'expense',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethods[0] || 'Cash',
      isRecurring: false,
      recurrenceFrequency: 'none',
    }
  );

  // Debounced Auto-Categorize Effect
  useEffect(() => {
    if (!formData.description || formData.description.length < 3 || editTransaction) return;

    const timer = setTimeout(async () => {
      setLoadingAi(true);
      try {
        // Pass the current expense categories to the AI so it predicts correctly based on user settings
        const result = await autoCategorizeTransaction(formData.description!, categories.expense);
        if (result) {
          setFormData(prev => ({
            ...prev,
            category: prev.category && prev.category !== 'Other' ? prev.category : (result.category || prev.category),
            type: (result.type as TransactionType) || prev.type,
            paymentMethod: prev.paymentMethod && prev.paymentMethod !== 'Cash' ? prev.paymentMethod : (result.paymentMethod || prev.paymentMethod),
            reason: result.reason || prev.reason,
            isRecurring: result.isRecurringLikely || prev.isRecurring
          }));
        }
      } catch (e) {
        console.error("Auto-categorize failed silently", e);
      } finally {
        setLoadingAi(false);
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [formData.description, editTransaction, categories.expense]);

  const handleAiAutoFill = async () => {
    if (!formData.description) return;
    setLoadingAi(true);
    const result = await autoCategorizeTransaction(formData.description, categories.expense);
    setLoadingAi(false);

    if (result) {
      setFormData(prev => ({
        ...prev,
        category: result.category || prev.category,
        type: (result.type as TransactionType) || prev.type,
        paymentMethod: result.paymentMethod || prev.paymentMethod,
        reason: result.reason || prev.reason,
        isRecurring: result.isRecurringLikely || prev.isRecurring
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const transaction: Transaction = {
      id: editTransaction?.id || crypto.randomUUID(),
      amount: Number(formData.amount),
      type: formData.type as TransactionType,
      category: formData.category || 'Other',
      description: formData.description || '',
      date: formData.date || new Date().toISOString(),
      paymentMethod: formData.paymentMethod,
      reason: formData.reason,
      isRecurring: formData.isRecurring || false,
      recurrenceFrequency: formData.recurrenceFrequency || 'none',
      createdAt: Date.now()
    };

    if (editTransaction) {
      updateTransaction(transaction);
    } else {
      addTransaction(transaction);
    }
    onClose();
  };

  const currentCategories = formData.type === 'income' ? categories.income : categories.expense;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {editTransaction ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'income', category: ''})}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                    formData.type === 'income' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-500'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'expense', category: ''})}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                    formData.type === 'expense' ? 'bg-white dark:bg-slate-600 shadow text-rose-600' : 'text-gray-500'
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g., Starbucks Coffee"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent pr-24"
                />
                <button
                  type="button"
                  onClick={handleAiAutoFill}
                  disabled={!formData.description || loadingAi}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {loadingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Auto-Fill
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date?.split('T')[0]}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Category</option>
                {currentCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Method</option>
                {paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.isRecurring}
                  onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">Recurring Transaction</label>
              </div>
              
              {formData.isRecurring && (
                 <select
                  value={formData.recurrenceFrequency}
                  onChange={e => setFormData({...formData, recurrenceFrequency: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                >
                  <option value="none">Frequency...</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium flex items-center"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};