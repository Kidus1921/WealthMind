
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TransactionForm } from './TransactionForm.tsx';
import { SmartImportModal } from './SmartImportModal.tsx';
import { Transaction } from '../types.ts';
import { Search, Filter, Trash2, Edit2, Plus, Sparkles, AlertTriangle, HandCoins, Clock, ChevronRight, X, User, ArrowUpRight, ArrowDownLeft, Info, Calendar, Activity } from 'lucide-react';

export const TransactionList: React.FC = () => {
  const { transactions, deleteTransaction, currency, focusEntity, setFocusEntity } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'loan'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [viewingLoan, setViewingLoan] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (focusEntity && focusEntity.type === 'loan') {
      const found = transactions.find(t => t.id === focusEntity.id);
      if (found) setViewingLoan(found);
      setFocusEntity(null);
    }
  }, [focusEntity, transactions]);

  const [repaymentPreset, setRepaymentPreset] = useState<Partial<Transaction> | null>(null);

  const filtered = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = t.description.toLowerCase().includes(searchLower) || 
                          t.category.toLowerCase().includes(searchLower) ||
                          (t.counterparty && t.counterparty.toLowerCase().includes(searchLower));
    return matchesType && matchesSearch;
  });

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setRepaymentPreset(null);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingTransaction(undefined);
    setRepaymentPreset(null);
    setIsFormOpen(true);
  };

  const openRepaymentForm = (counterparty: string) => {
     setViewingLoan(null);
     setEditingTransaction(undefined);
     setRepaymentPreset({
        type: 'expense',
        category: 'Loan Repayment',
        counterparty: counterparty,
        description: `Repayment to ${counterparty}`
     });
     setIsFormOpen(true);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Financial Ledger</h2>
           <p className="text-gray-500 dark:text-violet-400 font-medium text-sm">Managing {transactions.length} total entries</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
           <button onClick={() => setIsImportOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-50 dark:bg-violet-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 dark:hover:bg-violet-800 flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest">
            <Sparkles size={18} /> Smart Scan
          </button>
          <button onClick={handleAddNew} className="flex-1 sm:flex-none px-6 py-3 bg-primary text-white rounded-2xl hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/30 font-black text-xs uppercase tracking-widest">
            <Plus size={18} /> New Entry
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-violet-900 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-violet-800 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search entries..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white placeholder-gray-400 text-sm outline-none transition-all shadow-inner" 
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-violet-950 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'income', 'expense', 'loan'] as const).map(type => (
            <button 
              key={type} 
              onClick={() => setFilterType(type)} 
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === type ? 'bg-white dark:bg-violet-800 text-primary shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-violet-950/30 text-gray-400 dark:text-violet-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-100 dark:border-violet-800">
                <th className="p-6">Timeline</th>
                <th className="p-6">Activity</th>
                <th className="p-6 hidden lg:table-cell">Classification</th>
                <th className="p-6">Value</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-violet-800/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <Calendar size={48} />
                       <p className="font-black uppercase tracking-[0.2em] text-xs">No matching results found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                   const isLoan = t.type === 'loan' || t.category === 'Loan Repayment';
                   const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
                   
                   return (
                    <tr key={t.id} className={`hover:bg-gray-50/50 dark:hover:bg-violet-800/20 transition-all group`}>
                      <td className="p-6">
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-gray-800 dark:text-white">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                           <span className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-tighter">{new Date(t.date).getFullYear()}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center transition-all group-hover:scale-110 ${isInflow ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                             {isLoan ? <HandCoins size={18} /> : isInflow ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white truncate text-sm flex items-center gap-2">
                              {t.description}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                               {t.counterparty && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter flex items-center gap-1"><User size={10}/> {t.counterparty}</span>}
                               {t.dueDate && (
                                 <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter flex items-center gap-1">
                                   <Clock size={10} /> {new Date(t.dueDate).toLocaleDateString()}
                                 </span>
                               )}
                               <span className="lg:hidden text-[9px] font-black text-gray-400 dark:text-violet-500 bg-gray-100 dark:bg-violet-800 px-2 py-0.5 rounded-lg uppercase">{t.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 hidden lg:table-cell">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          t.type === 'loan' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 
                          t.category === 'Loan Repayment' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40' :
                          t.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'
                        }`}>
                          {t.category}
                        </span>
                      </td>
                      <td className={`p-6 font-black text-base tracking-tighter ${isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                          {isLoan && (
                             <button onClick={() => setViewingLoan(t)} className="p-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-violet-900/30 rounded-xl transition-all">
                                <Info size={18} />
                             </button>
                          )}
                          <button onClick={() => handleEdit(t)} className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => { setConfirmDeleteId(t.id); }} className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                   );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <TransactionForm 
          onClose={() => { setIsFormOpen(false); setRepaymentPreset(null); }} 
          editTransaction={editingTransaction}
          presetData={repaymentPreset || undefined}
        />
      )}

      {isImportOpen && (
        <SmartImportModal onClose={() => setIsImportOpen(false)} />
      )}

      {viewingLoan && (
        <LoanDetailsModal 
           loan={viewingLoan} 
           onClose={() => setViewingLoan(null)} 
           allTransactions={transactions}
           currency={currency}
           onMakeRepayment={(counterparty) => openRepaymentForm(counterparty)}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center border border-gray-100 dark:border-violet-800">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><AlertTriangle size={32} /></div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Delete Record?</h3>
            <p className="text-gray-500 dark:text-violet-400 text-sm font-medium mb-8 leading-relaxed">This action is permanent and cannot be reversed. Are you absolutely sure?</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-6 py-4 bg-gray-100 dark:bg-violet-800 text-gray-700 dark:text-violet-200 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Cancel</button>
              <button onClick={() => { if(confirmDeleteId) deleteTransaction(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 shadow-xl shadow-rose-600/30 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LoanDetailsModal: React.FC<{
  loan: Transaction, 
  onClose: () => void, 
  allTransactions: Transaction[], 
  currency: string,
  onMakeRepayment: (cp: string) => void
}> = ({ loan, onClose, allTransactions, currency, onMakeRepayment }) => {
  const history = useMemo(() => {
    if (!loan.counterparty) return [];
    return allTransactions.filter(t => 
      t.counterparty?.toLowerCase() === loan.counterparty?.toLowerCase() &&
      (t.type === 'loan' || t.category === 'Loan Repayment')
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loan.counterparty, allTransactions]);

  const metrics = useMemo(() => {
    let principal = 0;
    let repaid = 0;
    history.forEach(t => {
      if (t.type === 'loan') principal += t.amount;
      else if (t.category === 'Loan Repayment' && t.subtype !== 'loan_interest') repaid += t.amount;
    });
    return { principal, repaid, balance: Math.max(0, principal - repaid) };
  }, [history]);

  const progress = Math.min((metrics.repaid / metrics.principal) * 100, 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[160] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-violet-900 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-violet-800">
         <div className="p-8 border-b border-gray-100 dark:border-violet-800/50 flex justify-between items-center bg-gray-50/50 dark:bg-violet-950/50">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-sm">
                  <HandCoins size={32} />
               </div>
               <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-2xl tracking-tight">Contract Ledger</h3>
                  <p className="text-sm text-gray-500 dark:text-violet-400 font-bold uppercase tracking-widest">{loan.loanType === 'borrowed' ? 'Payable to' : 'Receivable from'} {loan.counterparty}</p>
               </div>
            </div>
            <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-violet-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-violet-700 transition-all active:scale-90"><X size={24} /></button>
         </div>

         <div className="p-10 space-y-10 overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
               <div className="space-y-1 text-center sm:text-left">
                  <p className="text-[10px] uppercase font-black text-gray-400 dark:text-violet-500 tracking-[0.2em]">Principal</p>
                  <p className="text-2xl font-black text-gray-800 dark:text-white leading-none">{currency}{metrics.principal.toLocaleString()}</p>
               </div>
               <div className="space-y-1 text-center sm:text-left">
                  <p className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em]">Liquidated</p>
                  <p className="text-2xl font-black text-emerald-600 leading-none">{currency}{metrics.repaid.toLocaleString()}</p>
               </div>
               <div className="space-y-1 text-center sm:text-left">
                  <p className="text-[10px] uppercase font-black text-rose-500 tracking-[0.2em]">Outstanding</p>
                  <p className="text-2xl font-black text-rose-600 leading-none">{currency}{metrics.balance.toLocaleString()}</p>
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                  <span className="text-gray-400">Repayment Matrix</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{progress.toFixed(0)}% Completion</span>
               </div>
               <div className="h-4 bg-gray-100 dark:bg-violet-950 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-[2000ms] shadow-lg shadow-indigo-500/30" style={{ width: `${progress}%` }} />
               </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-100 dark:border-indigo-900/40 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30"><Info size={20} /></div>
                  <p className="text-sm text-indigo-900 dark:text-indigo-200 font-bold leading-tight">Log a new repayment entry for this counterparty?</p>
               </div>
               <button 
                  onClick={() => onMakeRepayment(loan.counterparty!)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Post Payment
               </button>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-[0.3em] flex items-center gap-3">
                  <Activity size={16} /> Audit Trail Log
               </h4>
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-3 scrollbar-thin">
                  {history.map(t => (
                     <div key={t.id} className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-violet-950/50 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-violet-700 transition-all group">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${t.type === 'loan' ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/40' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/40'}`}>
                              {t.type === 'loan' ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                           </div>
                           <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white leading-none mb-1">{t.description || t.category}</p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                           </div>
                        </div>
                        <span className={`font-black tracking-tighter ${t.type === 'loan' ? 'text-gray-400 dark:text-violet-500' : 'text-emerald-500'}`}>
                           {t.type === 'loan' ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                        </span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
