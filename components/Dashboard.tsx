
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { transactions, currency } = useApp();

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Data for the mini chart (last 7 days)
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      
      data.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        income,
        expense
      });
    }
    return data;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Balance</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white truncate">
            {currency}{summary.balance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Available funds</p>
        </div>

        {/* Income Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Income</h3>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            +{currency}{summary.income.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Total earnings</p>
        </div>

        {/* Expense Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Expenses</h3>
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 truncate">
            -{currency}{summary.expense.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Total spending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 h-[300px] md:h-[350px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-[300px] md:h-[350px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recent Transactions</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p>No transactions yet.</p>
              </div>
            ) : (
              transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center ${
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {t.type === 'income' ? <TrendingUp size={18} /> : <DollarSign size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{t.description}</p>
                      <p className="text-xs text-gray-500 truncate">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ml-2 whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{currency}{Math.abs(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
