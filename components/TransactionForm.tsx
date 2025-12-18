
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, LoanKind, TransactionSubtype } from '../types.ts';
import { autoCategorizeTransaction } from '../services/geminiService.ts';
import { useApp } from '../context/AppContext.tsx';
import { Sparkles, Loader2, Check, HandCoins, Info, Calendar, User, DollarSign, X, Clock, Wallet } from 'lucide-react';

interface Props {
  onClose: () => void;
  editTransaction?: Transaction;
  presetData?: Partial<Transaction>;
}

export const TransactionForm: React.FC<Props> = ({ onClose, editTransaction, presetData }) => {
  const { addTransaction, updateTransaction, categories, paymentMethods } = useApp();
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TransactionType>(
    editTransaction?.type || (presetData?.type as TransactionType) || 'expense'
  );
  const [hasDueDate, setHasDueDate] = useState(!!editTransaction?.dueDate);
  
  const [formData, setFormData] = useState<Partial<Transaction>>(
    editTransaction || {
      amount: 0,
      type: (presetData?.type as TransactionType) || 'expense',
      description: presetData?.description || '',
      category: presetData?.category || '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentMethod: paymentMethods[0] || 'Cash',
      isRecurring: false,
      recurrenceFrequency: 'none',
      referenceId: '',
      loanType: 'borrowed',
      counterparty: presetData?.counterparty || '',
      subtype: null
    }
  );

  useEffect(() => {
    if (activeTab === 'loan' || presetData) return;
    if (!formData.description || formData.description.length < 3 || editTransaction) return;

    const timer = setTimeout(async () => {
      setLoadingAi(true);
      try {
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
  }, [formData.description, editTransaction, categories.expense, activeTab, presetData]);

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
    
    let finalCategory = formData.category || 'Other';
    let finalSubtype: TransactionSubtype = null;

    if (activeTab === 'loan') {
        finalCategory = 'Loan';
        finalSubtype = 'loan_principal';
    } else if (activeTab === 'expense' && finalCategory === 'Loan Repayment') {
        finalSubtype = 'loan_repayment';
    }

    const transaction: Transaction = {
      id: editTransaction?.id || crypto.randomUUID(),
      amount: Number(formData.amount),
      type: activeTab,
      category: finalCategory,
      subtype: finalSubtype,
      loanType: activeTab === 'loan' ? (formData.loanType as LoanKind) : undefined,
      counterparty: (activeTab === 'loan' || finalCategory === 'Loan Repayment') ? formData.counterparty : undefined,
      description: formData.description || (activeTab === 'loan' ? `Loan with ${formData.counterparty}` : ''),
      date: formData.date || new Date().toISOString(),
      dueDate: (activeTab === 'loan' && hasDueDate) ? formData.dueDate : undefined,
      paymentMethod: formData.paymentMethod,
      reason: formData.reason,
      isRecurring: formData.isRecurring || false,
      recurrenceFrequency: formData.recurrenceFrequency || 'none',
      referenceId: formData.referenceId || undefined,
      createdAt: Date.now()
    };

    if (editTransaction) {
      updateTransaction(transaction);
    } else {
      addTransaction(transaction);
    }
    onClose();
  };

  const currentCategories = activeTab === 'income' ? categories.income : categories.expense;
  const isRepaymentSelected = activeTab === 'expense' && formData.category === 'Loan Repayment';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex p-2 bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shrink-0">
          {(['income', 'expense', 'loan'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFormData(prev => ({ 
                  ...prev, 
                  type: tab, 
                  category: tab === 'loan' ? 'Loan' : (tab === 'income' ? categories.income[0] : categories.expense[0]) 
                }));
              }}
              className={`flex-1 py-3 text-sm font-bold capitalize transition-all rounded-2xl flex items-center justify-center gap-2
                ${activeTab === tab 
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {tab === 'income' && <Check size={16} className="text-emerald-500" />}
              {tab === 'expense' && <X size={16} className="text-rose-500" />}
              {tab === 'loan' && <HandCoins size={16} className="text-indigo-500" />}
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'loan' ? (
             <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Loan Nature</label>
                   <div className="flex p-1 bg-gray-50 dark:bg-slate-900 rounded-xl gap-2">
                      <button type="button" onClick={() => setFormData({...formData, loanType: 'borrowed'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.loanType === 'borrowed' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-gray-400'}`}>Borrowed (I owe)</button>
                      <button type="button" onClick={() => setFormData({...formData, loanType: 'lent'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.loanType === 'lent' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-gray-400'}`}>Lent (Owed to me)</button>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Person / Organization</label>
                      <div className="relative">
                         <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                         <input type="text" required placeholder="e.g. Kaleb, Bank of America" value={formData.counterparty} onChange={e => setFormData({...formData, counterparty: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white" />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</label>
                         <div className="relative">
                           <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                           <input type="number" required min="0.01" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white" />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                         <div className="relative">
                           <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                           <input type="date" required value={formData.date?.split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white" />
                         </div>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select 
                          value={formData.paymentMethod} 
                          onChange={e => setFormData({...formData, paymentMethod: e.target.value})} 
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white appearance-none"
                        >
                          {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-2">
                      <input type="checkbox" id="set-due-date" checked={hasDueDate} onChange={e => setHasDueDate(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <label htmlFor="set-due-date" className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"><Clock size={16} className="text-indigo-500" /> Set a repayment deadline?</label>
                   </div>
                   {hasDueDate && (
                      <div className="animate-in slide-in-from-top-2 duration-200 bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                         <label className="block text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-1">Repayment Due Date</label>
                         <input type="date" required={hasDueDate} value={formData.dueDate?.split('T')[0]} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary dark:text-white text-sm" />
                      </div>
                   )}
                </div>
             </div>
          ) : (
             <div className="space-y-4 animate-in fade-in duration-200">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{activeTab === 'income' ? 'Income Source' : 'Vendor / Description'}</label>
                  <div className="relative">
                    <input type="text" required placeholder={activeTab === 'income' ? "e.g. Monthly Salary" : "e.g. Starbucks Coffee"} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white pr-24" />
                    <button type="button" onClick={handleAiAutoFill} disabled={!formData.description || loadingAi} className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-white dark:bg-slate-700 text-primary rounded-xl text-xs font-bold flex items-center gap-1 hover:shadow-md disabled:opacity-50 border border-gray-100 dark:border-slate-600">
                      {loadingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AUTO
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</label>
                    <input type="number" required min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                    <input type="date" required value={formData.date?.split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white">
                      <option value="">Select Category</option>
                      {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                    <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white">
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                {isRepaymentSelected && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Person / Organization being repaid</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" required placeholder="Link to original loan counterparty" value={formData.counterparty} onChange={e => setFormData({...formData, counterparty: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-2xl bg-indigo-50 dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900 focus:ring-2 focus:ring-primary dark:text-white" />
                    </div>
                  </div>
                )}
             </div>
          )}
          <div className="space-y-4">
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Context / Reason</label>
             <textarea placeholder="Any additional notes..." value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white min-h-[80px]" />
          </div>
        </form>
        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
            <Check size={20} /> Save Record
          </button>
        </div>
      </div>
    </div>
  );
};
