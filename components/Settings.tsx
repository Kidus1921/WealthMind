
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Trash2, Edit2, Plus, Moon, Sun, Wallet, Tag, TrendingDown, Settings as SettingsIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    theme, toggleTheme, 
    currency, setCurrency,
    currencies, addCurrency, deleteCurrency,
    categories, addCategory, deleteCategory,
    paymentMethods, addPaymentMethod, deletePaymentMethod
  } = useApp();

  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  const handleAddCategory = (type: 'income' | 'expense') => {
    const val = type === 'income' ? newIncomeCat : newExpenseCat;
    if (val.trim()) {
      if (categories[type].includes(val.trim())) {
        alert('This tag already exists!');
        return;
      }
      addCategory(type, val.trim());
      if (type === 'income') setNewIncomeCat('');
      else setNewExpenseCat('');
    }
  };

  const handleAddPayment = () => {
    if (newPaymentMethod.trim()) {
      if (paymentMethods.includes(newPaymentMethod.trim())) {
        alert('Payment method already exists!');
        return;
      }
      addPaymentMethod(newPaymentMethod.trim());
      setNewPaymentMethod('');
    }
  };

  const handleAddNewCurrency = () => {
    const symbol = prompt("Enter new currency symbol (e.g. BTC, NGN, AED):");
    if (symbol && symbol.trim()) {
      if (currencies.includes(symbol.trim())) {
        alert('Currency already exists!');
        return;
      }
      addCurrency(symbol.trim());
    }
  };

  const handleEditCurrency = (oldSymbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSymbol = prompt("Edit currency symbol:", oldSymbol);
    if (newSymbol && newSymbol.trim() && newSymbol !== oldSymbol) {
      deleteCurrency(oldSymbol);
      addCurrency(newSymbol.trim());
      if (currency === oldSymbol) setCurrency(newSymbol.trim());
    }
  };

  const handleDeleteCurrency = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currencies.length <= 1) {
      alert("At least one currency must remain.");
      return;
    }
    if (confirm(`Delete ${symbol}?`)) {
      deleteCurrency(symbol);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Configuration</h2>
          <p className="text-gray-500 dark:text-violet-400 font-medium">Personalize your wealth tracking experience</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Unified System Settings & Currency CRUD */}
        <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 p-8 flex flex-col h-full lg:col-span-2">
           <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest mb-8 flex items-center gap-2">
             <SettingsIcon size={16} /> System Settings
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                 <div>
                    <p className="font-black text-gray-900 dark:text-white">Interface Mode</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter mb-4">Appearance preferences</p>
                    <button 
                        onClick={toggleTheme}
                        className="w-full py-4 bg-gray-50 dark:bg-violet-950 text-primary rounded-2xl hover:scale-[1.02] transition-all shadow-inner border border-transparent dark:border-violet-800 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest"
                    >
                        {theme === 'dark' ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Dark Mode</>}
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="font-black text-gray-900 dark:text-white">Currency Ledger Management</p>
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-violet-950 rounded-[2rem] shadow-inner border border-transparent dark:border-violet-800">
                    {currencies.map(c => (
                      <div 
                        key={c}
                        onClick={() => setCurrency(c)}
                        className={`group relative h-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${
                          currency === c 
                            ? 'bg-white dark:bg-violet-800 text-primary shadow-xl ring-2 ring-primary/20 scale-[1.02] z-10' 
                            : 'bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-violet-200'
                        }`}
                      >
                        <span className="text-xs font-black">{c}</span>
                        
                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-white/95 dark:bg-violet-900/95 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
                           <button 
                            onClick={(e) => handleEditCurrency(c, e)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                           >
                            <Edit2 size={14} />
                           </button>
                           <button 
                            onClick={(e) => handleDeleteCurrency(c, e)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                           >
                            <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    ))}
                    {/* Add Button at the end of the queue */}
                    <button
                      onClick={handleAddNewCurrency}
                      className="h-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-violet-800 text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-2 transition-all group"
                    >
                      <Plus size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Add</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 p-8 flex flex-col h-full">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest flex items-center gap-2">
                <Wallet size={16} /> Payment Infrastructure
              </h3>
           </div>
           
           <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. PayPal, Cash..."
                  value={newPaymentMethod}
                  onChange={e => setNewPaymentMethod(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPayment()}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white placeholder:text-gray-400 font-bold shadow-inner outline-none transition-all"
                />
                <button 
                  onClick={handleAddPayment}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  Add
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-2 scrollbar-thin">
                 {paymentMethods.map(method => (
                   <div key={method} className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-violet-950/30 border border-transparent hover:border-primary/20 transition-all">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-violet-200 uppercase tracking-wide">{method}</span>
                      <button onClick={() => deletePaymentMethod(method)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                        <Trash2 size={14}/>
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 p-8 flex flex-col h-full">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-500" /> Expense Tags
              </h3>
              <Tag size={16} className="text-gray-300" />
           </div>
           
           <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Health, Travel..."
                  value={newExpenseCat}
                  onChange={e => setNewExpenseCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory('expense')}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-rose-500/10 dark:text-white placeholder:text-gray-400 font-bold shadow-inner outline-none transition-all"
                />
                <button 
                  onClick={() => handleAddCategory('expense')}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                >
                  Add
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                 {categories.expense.map(cat => (
                   <div key={cat} className="group flex items-center justify-between p-4 rounded-xl bg-rose-50/20 dark:bg-violet-950/30 border border-transparent hover:border-rose-500/30 transition-all">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-violet-200 uppercase tracking-wide">{cat}</span>
                      <button onClick={() => deleteCategory('expense', cat)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                        <Trash2 size={14}/>
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
