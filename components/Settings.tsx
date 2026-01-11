
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Trash2, Plus, Moon, Sun, Wallet, AlertCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    theme, toggleTheme, 
    currency, setCurrency,
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
        alert('Category already exists!');
        return;
      }
      addCategory(type, val);
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
      addPaymentMethod(newPaymentMethod);
      setNewPaymentMethod('');
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
        {/* General Preferences */}
        <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 p-8 flex flex-col justify-between">
           <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest mb-8">System Settings</h3>
           <div className="space-y-8">
              <div className="flex justify-between items-center">
                 <div>
                    <p className="font-black text-gray-900 dark:text-white">Interface Mode</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Switch between light and dark</p>
                 </div>
                 <button 
                    onClick={toggleTheme}
                    className="p-4 bg-gray-50 dark:bg-violet-950 text-primary rounded-2xl hover:scale-105 transition-all shadow-inner"
                 >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
              </div>

              <div className="space-y-4">
                 <p className="font-black text-gray-900 dark:text-white">Currency Symbol</p>
                 <div className="flex gap-2 p-1.5 bg-gray-50 dark:bg-violet-950 rounded-2xl shadow-inner">
                    {['$', '€', '£', '¥', '₹'].map(c => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center font-black transition-all ${
                          currency === c 
                            ? 'bg-white dark:bg-violet-800 text-primary shadow-xl ring-1 ring-black/5' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-violet-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 p-8">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Payment Infrastructure</h3>
              <Wallet size={18} className="text-gray-300" />
           </div>
           
           <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="New payment method..."
                  value={newPaymentMethod}
                  onChange={e => setNewPaymentMethod(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPayment()}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white placeholder:text-gray-400 font-bold shadow-inner outline-none transition-all"
                />
                <button 
                  onClick={handleAddPayment}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95"
                >
                  Add
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                 {paymentMethods.map(method => (
                   <div key={method} className="group flex items-center justify-between p-3 pl-4 rounded-xl bg-gray-50 dark:bg-violet-950/30 border border-transparent hover:border-gray-100 dark:hover:border-violet-800 transition-all">
                      <span className="text-xs font-bold text-gray-700 dark:text-violet-200">{method}</span>
                      <button onClick={() => deletePaymentMethod(method)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
