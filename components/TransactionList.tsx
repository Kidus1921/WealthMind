
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TransactionForm } from './TransactionForm.tsx';
import { SmartImportModal } from './SmartImportModal.tsx';
import { Transaction } from '../types.ts';
import { Search, Filter, Trash2, Edit2, Plus, Sparkles, AlertTriangle, HandCoins, Clock, ChevronRight, X, User, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';

export const TransactionList: React.FC = () => {
  const { transactions, deleteTransaction, currency, focusEntity, setFocusEntity } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'loan'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [viewingLoan, setViewingLoan] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Deep Link Focus Effect
  useEffect(() => {
    if (focusEntity && focusEntity.type === 'loan') {
      const found = transactions.find(t => t.id === focusEntity.id);
      if (found) {
        setViewingLoan(found);
      }
      setFocusEntity(null);
    }
  }, [focusEntity, transactions]);

  // Forced Repayment Shortcut
  const [repaymentPreset, setRepaymentPreset] = useState<Partial<Transaction> | null>(null);

  const filtered = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = t.description.toLowerCase().includes(searchLower) || 
                          t.category.toLowerCase().includes(searchLower) ||
                          (t.counterparty && t.counterparty.toLowerCase().includes(searchLower)) ||
                          (t.referenceId && t.referenceId.toLowerCase().includes(searchLower));
    return matchesType && matchesSearch;
  });

  const handleShowDeleteConfirm = (id: string) => setConfirmDeleteId(id);
  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteTransaction(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Financial History</h2>
        <div className="flex gap-2">
           <button onClick={() => setIsImportOpen(true)} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-2 transition-all font-medium">
            <Sparkles size={18} /> Smart Import
          </button>
          <button onClick={handleAddNew} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/30 font-medium">
            <Plus size={18} /> Add Record
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by vendor, counterparty, or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary dark:text-white placeholder-gray-400" />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
          {(['all', 'income', 'expense', 'loan'] as const).map(type => (
            <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${filterType === type ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest border-b border-gray-200 dark:border-slate-700">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Label</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No records found.</td></tr>
              ) : (
                filtered.map(t => {
                   const isLoan = t.type === 'loan' || t.category === 'Loan Repayment';
                   const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
                   return (
                    <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group ${focusEntity?.id === t.id ? 'bg-primary/5 ring-1 ring-primary' : ''}`}>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {t.description}
                            {isLoan && <HandCoins size={14} className="text-indigo-500" />}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                             {t.paymentMethod && <span>{t.paymentMethod}</span>}
                             {t.counterparty && <span>• {t.counterparty}</span>}
                             {t.dueDate && (
                               <span className="flex items-center gap-1 px-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300">
                                 <Clock size={10} /> Due: {new Date(t.dueDate).toLocaleDateString()}
                               </span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                          t.type === 'loan' ? 'bg-indigo-100 text-indigo-600' : 
                          t.category === 'Loan Repayment' ? 'bg-orange-100 text-orange-600' :
                          t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {t.category}
                        </span>
                      </td>
                      <td className={`p-4 font-bold text-lg ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isLoan && (
                             <button onClick={() => setViewingLoan(t)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-1 text-xs font-bold">
                                Details
                             </button>
                          )}
                          <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleShowDeleteConfirm(t.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 size={16} />
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

      {/* Loan Details Aggregator Modal */}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-sm w-full p-6 text-center border border-gray-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Record?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors">Cancel</button>
              <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-medium shadow-lg shadow-rose-600/20 transition-colors">Delete</button>
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
    let interest = 0;
    let repaid = 0;

    history.forEach(t => {
      if (t.type === 'loan') principal += t.amount;
      else if (t.category === 'Loan Repayment') {
         if (t.subtype === 'loan_interest') interest += t.amount;
         else repaid += t.amount;
      }
    });

    return { principal, interest, repaid, balance: principal - repaid };
  }, [history]);

  const loanKindLabel = loan.loanType === 'borrowed' ? 'Borrowed from' : 'Lent to';
  const progress = Math.min((metrics.repaid / metrics.principal) * 100, 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
         <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <HandCoins size={24} />
               </div>
               <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-lg">Loan Overview</h3>
                  <p className="text-sm text-gray-500 font-medium">{loanKindLabel} {loan.counterparty}</p>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"><X size={24} /></button>
         </div>

         <div className="p-8 space-y-8 overflow-y-auto">
            {/* High Level Stats */}
            <div className="grid grid-cols-3 gap-6">
               <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Principal</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{currency}{metrics.principal.toLocaleString()}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-emerald-500 tracking-wider">Settled</p>
                  <p className="text-xl font-bold text-emerald-600">{currency}{metrics.repaid.toLocaleString()}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-rose-500 tracking-wider">Remaining</p>
                  <p className="text-xl font-bold text-rose-600">{currency}{metrics.balance.toLocaleString()}</p>
               </div>
            </div>

            {/* Visual Progress */}
            <div className="space-y-2">
               <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-500">Repayment Progress</span>
                  <span className="text-indigo-600">{progress.toFixed(0)}%</span>
               </div>
               <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
               </div>
            </div>

            {/* Repayment Shortcut */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Info size={20} className="text-indigo-500" />
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 font-bold">Log a new payment towards this balance?</p>
               </div>
               <button 
                  onClick={() => onMakeRepayment(loan.counterparty!)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors"
                >
                  Make Repayment
               </button>
            </div>

            {/* Detailed Log */}
            <div className="space-y-4">
               <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} /> Full History Log
               </h4>
               <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                  {history.map(t => (
                     <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-all">
                        <div className="flex items-center gap-3">
                           {t.type === 'loan' ? <ArrowUpRight className="text-rose-500" size={18}/> : <ArrowDownLeft className="text-emerald-500" size={18}/>}
                           <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-white">{t.description || t.category}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.date).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <span className={`font-black ${t.type === 'loan' ? 'text-gray-400' : 'text-emerald-600'}`}>
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
