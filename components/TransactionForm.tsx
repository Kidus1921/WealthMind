
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, LoanKind, TransactionSubtype } from '../types.ts';
import { autoCategorizeTransaction } from '../services/geminiService.ts';
import { useApp } from '../context/AppContext.tsx';
import { Sparkles, Loader2, Check, HandCoins, Info, Calendar, User, DollarSign, X, Clock, Wallet, LayoutGrid } from 'lucide-react';

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
        console.error("Auto-categorize failed", e);
      } finally {
        setLoadingAi(false);
      }
    }, 1200); 

    return () => clearTimeout(timer);
  }, [formData.description, editTransaction, categories.expense, activeTab, presetData]);

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

    if (editTransaction) updateTransaction(transaction);
    else addTransaction(transaction);
    onClose();
  };

  const currentCategories = activeTab === 'income' ? categories.income : categories.expense;
  const isRepaymentSelected = activeTab === 'expense' && formData.category === 'Loan Repayment';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4 transition-all duration-300">
      <div className="bg-white dark:bg-violet-900 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-xl shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.5)] sm:shadow-2xl max-h-[92vh] sm:max-h-[95vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 border-x border-t sm:border border-gray-100 dark:border-violet-800">
        <div className="p-3 bg-gray-100 dark:bg-violet-950 border-b border-gray-200 dark:border-violet-800 shrink-0 flex items-center gap-2">
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
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-3xl flex items-center justify-center gap-2 active:scale-95
                ${activeTab === tab 
                  ? 'bg-white dark:bg-violet-900 text-primary shadow-xl ring-1 ring-black/5' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }
              `}
            >
              {tab === 'income' && <Check size={14} className="text-emerald-500" />}
              {tab === 'expense' && <X size={14} className="text-rose-500" />}
              {tab === 'loan' && <HandCoins size={14} className="text-indigo-500" />}
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8 overflow-y-auto flex-1 scrollbar-thin">
          {activeTab === 'loan' ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Transaction Nature</label>
                   <div className="flex p-1.5 bg-gray-50 dark:bg-violet-950 rounded-2xl gap-2 shadow-inner">
                      <button type="button" onClick={() => setFormData({...formData, loanType: 'borrowed'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.loanType === 'borrowed' ? 'bg-white dark:bg-violet-900 text-rose-500 shadow-md' : 'text-gray-400 opacity-50'}`}>Payable</button>
                      <button type="button" onClick={() => setFormData({...formData, loanType: 'lent'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.loanType === 'lent' ? 'bg-white dark:bg-violet-900 text-emerald-500 shadow-md' : 'text-gray-400 opacity-50'}`}>Receivable</button>
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Counterparty</label>
                      <div className="relative">
                         <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                         <input type="text" required placeholder="e.g. David, Bank of NY" value={formData.counterparty} onChange={e => setFormData({...formData, counterparty: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white placeholder:text-gray-400 font-bold transition-all shadow-inner outline-none" />
                      </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Principal Amount</label>
                         <div className="relative">
                           <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                           <input type="number" required min="0.01" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Origin Date</label>
                         <div className="relative">
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                           <input type="date" required value={formData.date?.split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          ) : (
             <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">{activeTab === 'income' ? 'Origin' : 'Label / Payee'}</label>
                  <div className="relative group">
                    <input type="text" required placeholder={activeTab === 'income' ? "e.g. Corporate Salary" : "e.g. Daily Groceries"} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white pr-28 font-bold transition-all shadow-inner outline-none" />
                    <button type="button" onClick={() => {}} disabled={!formData.description || loadingAi} className="absolute right-2 top-2 bottom-2 px-4 bg-white dark:bg-violet-800 text-primary rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:shadow-xl disabled:opacity-50 border border-gray-100 dark:border-violet-700 transition-all active:scale-90">
                      {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Amount</label>
                    <div className="relative">
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input type="number" required min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Timeline</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input type="date" required value={formData.date?.split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Tag</label>
                    <div className="relative">
                       <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none appearance-none">
                        {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Method</label>
                    <div className="relative">
                       <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none appearance-none">
                        {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
             </div>
          )}
          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Additional Context</label>
             <textarea placeholder="Reasoning or notes..." value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-6 py-5 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white min-h-[120px] font-medium transition-all shadow-inner outline-none" />
          </div>
        </form>

        <div className="p-8 sm:p-10 border-t border-gray-100 dark:border-violet-800 bg-gray-50 dark:bg-violet-950/50 flex gap-4 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-4.5 rounded-[1.5rem] text-gray-500 dark:text-violet-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-violet-800 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="flex-[2] py-4.5 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-95">
            <Check size={20} /> Commit Entry
          </button>
        </div>
      </div>
    </div>
  );
};
