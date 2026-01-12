
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
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
           <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Ledger</h2>
           <p className="text-gray-500 dark:text-violet-400 font-medium text-xs md:text-sm">{transactions.length} entries recorded</p>
        </div>
        <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
           <button onClick={() => setIsImportOpen(true)} className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-indigo-50 dark:bg-violet-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 flex items-center justify-center gap-2 transition-all font-black text-[10px] md:text-xs uppercase tracking-widest shadow-sm">
            <Sparkles size={16} className="md:w-5 md:h-5" /> <span className="hidden xs:inline">Scan</span>
          </button>
          <button onClick={handleAddNew} className="flex-[2] sm:flex-none px-6 md:px-8 py-3 bg-primary text-white rounded-2xl hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/30 font-black text-[10px] md:text-xs uppercase tracking-widest">
            <Plus size={16} className="md:w-5 md:h-5" /> Add New
          </button>
        </div>
      </div>

      {/* Responsive Filters */}
      <div className="bg-white dark:bg-violet-900 p-3 md:p-5 rounded-2xl md:rounded-[2rem] shadow-sm border border-gray-100 dark:border-violet-800 flex flex-col md:flex-row gap-3 md:gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          <input 
            type="text" 
            placeholder="Search entries..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-11 pr-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white text-xs md:text-sm outline-none transition-all shadow-inner" 
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-violet-950 p-1 rounded-xl md:rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'income', 'expense', 'loan'] as const).map(type => (
            <button 
              key={type} 
              onClick={() => setFilterType(type)} 
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === type ? 'bg-white dark:bg-violet-800 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Content: Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white dark:bg-violet-900 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden">
        
        {/* Mobile-Only Card View */}
        <div className="md:hidden divide-y divide-gray-50 dark:divide-violet-800/50">
          {sortedAndFiltered.length === 0 ? (
            <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest opacity-30">No results</div>
          ) : (
            sortedAndFiltered.map(t => {
              const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
              const deadline = (t.type === 'loan' && t.loanType === 'borrowed' && t.dueDate) ? getDeadlineInfo(t.dueDate) : null;
              return (
                <div key={t.id} className="p-5 flex items-start gap-4 active:bg-gray-50 dark:active:bg-violet-800/10 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center ${isInflow ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                    {t.type === 'loan' ? <HandCoins size={18} /> : isInflow ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                       <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{t.description}</p>
                       <p className={`font-black text-sm tracking-tighter shrink-0 ${isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                       </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{new Date(t.date).toLocaleDateString()}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-violet-800 text-gray-500 dark:text-violet-400 uppercase font-black">{t.category}</span>
                    </div>
                    {deadline && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${deadline.style}`}>
                        <Clock size={10}/> {deadline.text}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-violet-800">
                      <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-primary"><Edit2 size={16}/></button>
                      <button onClick={() => setConfirmDeleteId(t.id)} className="p-2 text-gray-400 hover:text-rose-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop-Only Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-violet-950/30 text-gray-400 dark:text-violet-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-100 dark:border-violet-800">
                <th className="w-[15%]">
                  <button onClick={() => handleSort('date')} className="w-full h-full p-6 flex items-center gap-2 hover:bg-gray-100/50 dark:hover:bg-violet-800/50 transition-colors group text-left">
                    Timeline <SortIcon field="date" />
                  </button>
                </th>
                <th className="w-[55%]">
                  <button onClick={() => handleSort('description')} className="w-full h-full p-6 flex items-center gap-2 hover:bg-gray-100/50 dark:hover:bg-violet-800/50 transition-colors group text-left">
                    Activity <SortIcon field="description" />
                  </button>
                </th>
                <th className="w-[15%]">
                  <button onClick={() => handleSort('amount')} className="w-full h-full p-6 flex items-center justify-end gap-2 hover:bg-gray-100/50 dark:hover:bg-violet-800/50 transition-colors group text-right">
                    Value <SortIcon field="amount" />
                  </button>
                </th>
                <th className="p-6 w-[15%] text-right cursor-default">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-violet-800/50">
              {sortedAndFiltered.map(t => {
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
                      <td className="p-6">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center ${isInflow ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                             {t.type === 'loan' ? <HandCoins size={18} /> : isInflow ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white truncate text-sm">{t.description}</span>
                                {deadline && (
                                   <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shrink-0 ${deadline.style}`}>
                                      <Clock size={10} /> {deadline.text}
                                   </span>
                                )}
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase mt-0.5">{t.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className={`p-6 text-right font-black text-base tracking-tighter ${isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-primary"><Edit2 size={18} /></button>
                          <button onClick={() => setConfirmDeleteId(t.id)} className="p-2 text-gray-400 hover:text-rose-500"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                   );
              })}
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

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-violet-900 rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center border dark:border-violet-800">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Delete Record?</h3>
            <p className="text-gray-500 dark:text-violet-400 text-xs mb-8">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-violet-800 text-gray-700 dark:text-violet-200 rounded-xl font-black uppercase text-[10px]">Cancel</button>
              <button onClick={() => { if(confirmDeleteId) deleteTransaction(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
