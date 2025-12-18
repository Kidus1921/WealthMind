
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft, HandCoins, Info, AlertCircle, Clock, User, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { transactions, currency } = useApp();

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let balance = 0;
    
    transactions.forEach(t => {
      const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
      if (isInflow) balance += t.amount;
      else balance -= t.amount;

      if (t.subtype === 'loan_principal') return;
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });

    return { income, expense, balance };
  }, [transactions]);

  // Aggregated Loan Data for Progress Tracking
  const loanStats = useMemo(() => {
    const groups: Record<string, { 
      principal: number, 
      repaid: number, 
      counterparty: string,
      loanType: 'borrowed' | 'lent'
    }> = {};

    transactions.forEach(t => {
      if (!t.counterparty) return;
      let typeKey: 'borrowed' | 'lent';
      if (t.type === 'loan') {
        typeKey = t.loanType as 'borrowed' | 'lent';
      } else if (t.category === 'Loan Repayment') {
        typeKey = t.type === 'expense' ? 'borrowed' : 'lent';
      } else {
        return;
      }

      const key = `${typeKey}:${t.counterparty.toLowerCase().trim()}`;
      if (!groups[key]) {
        groups[key] = { principal: 0, repaid: 0, counterparty: t.counterparty, loanType: typeKey };
      }

      if (t.type === 'loan' || t.subtype === 'loan_principal') {
        groups[key].principal += t.amount;
      } else if (t.subtype === 'loan_repayment' || t.category === 'Loan Repayment') {
        groups[key].repaid += t.amount;
      }
    });

    return Object.values(groups)
      .filter(g => g.principal > 0)
      .map(g => ({
        ...g,
        remaining: g.principal - g.repaid,
        progress: Math.min((g.repaid / g.principal) * 100, 100)
      }))
      .filter(g => g.remaining > 0); // Only active loans
  }, [transactions]);

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      const income = dayTransactions.filter(t => t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed')).reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense' || (t.type === 'loan' && t.loanType === 'lent')).reduce((acc, t) => acc + t.amount, 0);
      data.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), income, expense });
    }
    return data;
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-purple-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
         <div className="relative z-10">
            <h3 className="text-white/70 font-medium mb-1">Total Available Balance</h3>
            <p className="text-5xl font-extrabold mb-8">{currency}{summary.balance.toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase mb-1">
                     <TrendingUp size={14} className="text-emerald-300" /> Real Inflow
                  </div>
                  <p className="text-xl font-bold">{currency}{summary.income.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase mb-1">
                     <TrendingDown size={14} className="text-rose-300" /> Real Outflow
                  </div>
                  <p className="text-xl font-bold">{currency}{summary.expense.toLocaleString()}</p>
               </div>
            </div>
         </div>
      </div>

      {/* Loan Progress Overview Section */}
      {loanStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <HandCoins size={18} className="text-indigo-500" />
              Active Loans & Debts
            </h3>
            <div className="space-y-5">
              {loanStats.map((loan, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {loan.counterparty}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${loan.loanType === 'borrowed' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {loan.loanType === 'borrowed' ? 'Debt' : 'Receivable'}
                        </span>
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-500">
                      {currency}{loan.remaining.toLocaleString()} left
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${loan.loanType === 'borrowed' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${loan.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 h-full flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-orange-500" />
              Quick Summary
            </h3>
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center font-bold">
                       <TrendingDown size={20} />
                    </div>
                    <p className="text-sm font-bold text-gray-600 dark:text-rose-200">Total Liabilities</p>
                 </div>
                 <p className="text-xl font-black text-rose-600">
                    {currency}{loanStats.filter(l => l.loanType === 'borrowed').reduce((acc, l) => acc + l.remaining, 0).toLocaleString()}
                 </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
                       <TrendingUp size={20} />
                    </div>
                    <p className="text-sm font-bold text-gray-600 dark:text-emerald-200">Total Receivables</p>
                 </div>
                 <p className="text-xl font-black text-emerald-600">
                    {currency}{loanStats.filter(l => l.loanType === 'lent').reduce((acc, l) => acc + l.remaining, 0).toLocaleString()}
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 h-[350px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Cash Flow Trend</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={3} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={0.1} fill="#ef4444" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-[350px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
            {transactions.slice(0, 10).map(t => {
              const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
              return (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center ${isInflow ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {t.type === 'loan' ? <HandCoins size={18} /> : isInflow ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{t.description}</p>
                      <p className="text-xs text-gray-500 truncate">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ml-2 ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
