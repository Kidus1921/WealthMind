
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TransactionForm } from './TransactionForm.tsx';
import { SmartImportModal } from './SmartImportModal.tsx';
import { Transaction } from '../types.ts';
import { Search, Filter, Trash2, Edit2, Plus, Sparkles, AlertTriangle, HandCoins, Clock } from 'lucide-react';

export const TransactionList: React.FC = () => {
  const { transactions, deleteTransaction, currency } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'loan'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    setIsFormOpen(true);
  };
  const handleAddNew = () => {
    setEditingTransaction(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">History</h2>
        <div className="flex gap-2">
           <button onClick={() => setIsImportOpen(true)} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-2 transition-all font-bold text-sm">
            <Sparkles size={18} /> Smart Import
          </button>
          <button onClick={handleAddNew} className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/30 font-bold text-sm">
            <Plus size={18} /> Record Transaction
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by vendor, category, or counterparty..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary dark:text-white placeholder-gray-400" />
        </div>
        <div className="flex bg-gray-50 dark:bg-slate-900 p-1 rounded-xl gap-1">
          {(['all', 'income', 'expense', 'loan'] as const).map(type => (
             <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${filterType === type ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {type}
             </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-100 dark:border-slate-700">
                <th className="p-4">Date</th>
                <th className="p-4">Entity / Source</th>
                <th className="p-4">Label</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-400"><AlertTriangle size={32} className="mx-auto mb-2 opacity-20" /> No records found.</td></tr>
              ) : (
                filtered.map(t => {
                   const isLoan = t.type === 'loan';
                   const isInflow = t.type === 'income' || (isLoan && t.loanType === 'borrowed');
                   return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors group">
                      <td className="p-4 text-sm font-medium text-gray-500">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">{t.description} {isLoan && <HandCoins size={14} className="text-indigo-500" />}</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                             {t.paymentMethod && <span>{t.paymentMethod}</span>}
                             {t.counterparty && <span>• {t.counterparty}</span>}
                             {isLoan && t.dueDate && (
                                <span className="flex items-center gap-1 px-1.5 rounded bg-indigo-50 text-indigo-500"><Clock size={10}/> {new Date(t.dueDate).toLocaleDateString()}</span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${isLoan ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                          {isLoan ? `Loan (${t.loanType})` : t.category}
                        </span>
                      </td>
                      <td className={`p-4 font-extrabold text-sm ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>{isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl"><Edit2 size={16} /></button>
                          <button onClick={() => handleShowDeleteConfirm(t.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={16} /></button>
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
      {isFormOpen && <TransactionForm onClose={() => setIsFormOpen(false)} editTransaction={editingTransaction} />}
      {isImportOpen && <SmartImportModal onClose={() => setIsImportOpen(false)} />}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-gray-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Delete Record?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200 rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 font-bold transition-colors">Keep</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 font-bold shadow-lg shadow-rose-600/20 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
