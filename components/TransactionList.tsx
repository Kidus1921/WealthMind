
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TransactionForm } from './TransactionForm.tsx';
import { SmartImportModal } from './SmartImportModal.tsx';
import { Transaction } from '../types.ts';
import { 
  Search, Filter, Trash2, Edit2, Plus, Sparkles, AlertTriangle, 
  HandCoins, Clock, ChevronRight, X, User, ArrowUpRight, 
  ArrowDownLeft, Info, Calendar, Activity, BellRing, 
  ChevronUp, ChevronDown, ChevronsUpDown 
} from 'lucide-react';

type SortField = 'date' | 'description' | 'amount';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const TransactionList: React.FC = () => {
  const { transactions, deleteTransaction, currency, focusEntity, setFocusEntity } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'loan'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });
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

  const handleSort = (field: SortField) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        if (prev.direction === 'desc') return { field, direction: 'asc' };
        if (prev.direction === 'asc') return { field, direction: null };
        return { field, direction: 'desc' };
      }
      return { field, direction: 'desc' };
    });
  };

  const sortedAndFiltered = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = t.description.toLowerCase().includes(searchLower) || 
                            t.category.toLowerCase().includes(searchLower) ||
                            (t.counterparty && t.counterparty.toLowerCase().includes(searchLower));
      return matchesType && matchesSearch;
    });

    if (sortConfig.field && sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.field === 'amount') {
          // Adjust amount based on flow for logical sorting
          const isInflowA = a.type === 'income' || (a.type === 'loan' && a.loanType === 'borrowed');
          const isInflowB = b.type === 'income' || (b.type === 'loan' && b.loanType === 'borrowed');
          valA = isInflowA ? a.amount : -a.amount;
          valB = isInflowB ? b.amount : -b.amount;
        } else if (sortConfig.field === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        } else {
          valA = a[sortConfig.field]?.toString().toLowerCase() || '';
          valB = b[sortConfig.field]?.toString().toLowerCase() || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [transactions, filterType, searchTerm, sortConfig]);

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

  const getDeadlineInfo = (dueDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(dueDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        text: `Overdue ${Math.abs(diffDays)}d`, 
        style: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40',
        urgent: true 
      };
    } else if (diffDays === 0) {
      return { 
        text: 'Due Today', 
        style: 'bg-lemon-100 text-lemon-700 dark:bg-lemon-900/40',
        urgent: true 
      };
    } else if (diffDays <= 3) {
      return { 
        text: `In ${diffDays} days`, 
        style: 'bg-lemon-50 text-lemon-600 dark:bg-lemon-900/20',
        urgent: false 
      };
    } else {
      return { 
        text: deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
        style: 'bg-gray-100 text-gray-600 dark:bg-violet-800/40 dark:text-violet-300',
        urgent: false 
      };
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field || !sortConfig.direction) return <ChevronsUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
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
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === type ? 'bg-white dark:bg-violet-800 text-primary shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-violet-200'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-violet-950/30 text-gray-400 dark:text-violet-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-100 dark:border-violet-800">
                <th className="w-[15%]">
                  <button 
                    onClick={() => handleSort('date')} 
                    className="w-full h-full p-6 flex items-center gap-2 hover:bg-gray-100/50 dark:hover:bg-violet-800/50 transition-colors group text-left"
                  >
                    Timeline <SortIcon field="date" />
                  </button>
                </th>
                <th className="w-[55%]">
                  <button 
                    onClick={() => handleSort('description')} 
                    className="w-full h-full p-6 flex items-center gap-2 hover:bg-gray-100/50 dark:hover:bg-violet-800/50 transition-colors group text-left"
                  >
                    Activity <SortIcon field="description" />
                  </button>
                </th>
                <th className="w-[15%]">
                  <button 
                    onClick={() => handleSort('amount')} 
                    className="w-full h-full p-6 flex items-center justify-end gap-2 hover:bg-gray-100/50 dark:hover:bg-violet-800/50 transition-colors group text-right"
                  >
                    Value <SortIcon field="amount" />
                  </button>
                </th>
                <th className="p-6 w-[15%] text-right cursor-default">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-violet-800/50">
              {sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-xs font-black uppercase tracking-[0.2em] opacity-30">
                    No matching results found
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map(t => {
                   const isLoan = t.type === 'loan' || t.category === 'Loan Repayment';
                   const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
                   const deadline = (t.type === 'loan' && t.loanType === 'borrowed' && t.dueDate) ? getDeadlineInfo(t.dueDate) : null;
                   
                   return (
                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-violet-800/20 transition-all group">
                      <td className="p-6">
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-gray-800 dark:text-white">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                           <span className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-tighter">{new Date(t.date).getFullYear()}</span>
                        </div>
                      </td>
                      <td className="p-6 overflow-hidden">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 ${isInflow ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                             {isLoan ? <HandCoins size={18} /> : isInflow ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white truncate text-sm">
                                  {t.description}
                                </span>
                                {deadline && (
                                   <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${deadline.style} ${deadline.urgent ? 'animate-pulse' : ''}`}>
                                      <Clock size={10} /> {deadline.text}
                                   </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 min-w-0">
                               <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest truncate max-w-[120px] ${
                                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                               }`}>
                                 {t.category}
                               </span>
                               {t.counterparty && (
                                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter flex items-center gap-1 shrink-0">
                                   <User size={10}/> {t.counterparty}
                                 </span>
                               )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`p-6 text-right font-black text-base tracking-tighter whitespace-nowrap relative group/val ${isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                        
                        {isLoan && (
                           <div className="absolute right-6 bottom-full mb-2 hidden group-hover/val:block z-20">
                              <div className="bg-gray-800 text-[9px] text-white px-3 py-2 rounded-xl shadow-xl whitespace-nowrap font-black uppercase tracking-widest">
                                 {t.type === 'loan' ? 'Principal Capital' : 'Liability Liquidation'}
                              </div>
                              <div className="w-2 h-2 bg-gray-800 rotate-45 absolute -bottom-1 right-4"></div>
                           </div>
                        )}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isLoan && (
                             <button onClick={() => setViewingLoan(t)} className="p-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-violet-900/30 rounded-xl">
                                <Info size={18} />
                             </button>
                          )}
                          <button onClick={() => handleEdit(t)} className="p-2.5 text-gray-400 hover:text-primary rounded-xl">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(t.id)} className="p-2.5 text-gray-400 hover:text-rose-500 rounded-xl">
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Delete Record?</h3>
            <p className="text-gray-500 dark:text-violet-400 text-sm mb-8">This action is permanent.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-6 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
              <button onClick={() => { if(confirmDeleteId) deleteTransaction(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px]">Delete</button>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[160] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-violet-900 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-violet-800">
         <div className="p-8 border-b flex justify-between items-center bg-gray-50/50 dark:bg-violet-950/50">
            <h3 className="font-black text-gray-900 dark:text-white text-2xl tracking-tight">Contract Ledger</h3>
            <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-violet-800 rounded-2xl"><X size={24} /></button>
         </div>
         <div className="p-10 space-y-10">
            <div className="grid grid-cols-3 gap-8 text-center">
               <div>
                  <p className="text-[10px] uppercase font-black text-gray-400">Principal</p>
                  <p className="text-xl font-black">{currency}{metrics.principal.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[10px] uppercase font-black text-emerald-500">Repaid</p>
                  <p className="text-xl font-black text-emerald-600">{currency}{metrics.repaid.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[10px] uppercase font-black text-rose-500">Balance</p>
                  <p className="text-xl font-black text-rose-600">{currency}{metrics.balance.toLocaleString()}</p>
               </div>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-violet-950 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            {loan.dueDate && (
               <div className="p-6 bg-lemon-50 dark:bg-lemon-900/20 rounded-3xl border border-lemon-100 dark:border-lemon-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <BellRing className="text-lemon-600" size={20} />
                     <div>
                        <p className="text-[10px] font-black uppercase text-lemon-700 dark:text-lemon-400">Settlement Deadline</p>
                        <p className="font-bold text-gray-800 dark:text-white">{new Date(loan.dueDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                     </div>
                  </div>
                  {metrics.balance > 0 && (
                     <button 
                        onClick={() => onMakeRepayment(loan.counterparty!)}
                        className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
                     >
                        Clear Balance
                     </button>
                  )}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
