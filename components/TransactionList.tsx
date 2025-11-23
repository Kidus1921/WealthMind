import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TransactionForm } from './TransactionForm';
import { Transaction } from '../types';
import { Search, Filter, Trash2, Edit2, Plus } from 'lucide-react';

export const TransactionList: React.FC = () => {
  const { transactions, deleteTransaction, currency } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

  const filtered = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Transactions</h2>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/30"
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary dark:text-white placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'income' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'expense' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            Expense
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-slate-700">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No transactions found.</td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{t.description}</span>
                        {t.paymentMethod && <span className="text-xs text-gray-400">{t.paymentMethod}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-xs text-gray-600 dark:text-gray-300">
                        {t.category}
                      </span>
                    </td>
                    <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <TransactionForm onClose={() => setIsFormOpen(false)} editTransaction={editingTransaction} />
      )}
    </div>
  );
};