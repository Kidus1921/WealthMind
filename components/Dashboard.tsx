
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft, HandCoins, Info, AlertCircle, Clock, User } from 'lucide-react';
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

  const loanReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const groups: Record<string, { 
      principal: number, 
      repaid: number, 
      dueDate?: string, 
      startDate: string,
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
        groups[key] = { 
          principal: 0, 
          repaid: 0, 
          startDate: t.date,
          counterparty: t.counterparty,
          loanType: typeKey
        };
      }

      const g = groups[key];
      if (t.type === 'loan') {
        g.principal += t.amount;
        if (t.dueDate) {
          if (!g.dueDate || new Date(t.dueDate) > new Date(g.dueDate)) {
            g.dueDate = t.dueDate;
          }
        }
        if (new Date(t.date) < new Date(g.startDate)) {
          g.startDate = t.date;
        }
      } else if (t.subtype === 'loan_repayment' || t.category === 'Loan Repayment') {
        g.repaid += t.amount;
      }
    });

    const reminders: { message: string, amount: number, severity: 'overdue' | 'warning' | 'info', type: 'borrowed' | 'lent' }[] = [];

    Object.values(groups).forEach(g => {
      const remaining = g.principal - g.repaid;
      if (remaining <= 0) return;

      if (g.dueDate) {
        const dueDate = new Date(g.dueDate);
        const startDate = new Date(g.startDate);
        
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const totalTerm = Math.ceil((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        let notifyOffset = 0;
        if (totalTerm >= 30) notifyOffset = 7;
        else if (totalTerm >= 14) notifyOffset = 3;
        else if (totalTerm >= 7) notifyOffset = 2;
        else if (totalTerm >= 3) notifyOffset = 1;

        if (g.loanType === 'borrowed') {
          if (daysUntilDue < 0) {
            if (Math.abs(daysUntilDue) % 7 === 0 || Math.abs(daysUntilDue) === 1) {
              reminders.push({ 
                message: `Your loan from ${g.counterparty} is ${Math.abs(daysUntilDue)} days overdue.`, 
                amount: remaining, 
                severity: 'overdue', 
                type: 'borrowed' 
              });
            }
          } else if (daysUntilDue === 0) {
            reminders.push({ 
              message: `Today is the due date to repay ${g.counterparty} ${currency}${remaining.toLocaleString()}.`, 
              amount: remaining, 
              severity: 'warning', 
              type: 'borrowed' 
            });
          } else if (daysUntilDue <= notifyOffset) {
            reminders.push({ 
              message: `Your loan to repay ${g.counterparty} (${currency}${remaining.toLocaleString()}) is due in ${daysUntilDue} days.`, 
              amount: remaining, 
              severity: 'info', 
              type: 'borrowed' 
            });
          }
        } else {
          if (daysUntilDue < 0) {
             reminders.push({ 
               message: `${g.counterparty} owes you ${currency}${remaining.toLocaleString()} (Overdue by ${Math.abs(daysUntilDue)} days).`, 
               amount: remaining, 
               severity: 'overdue', 
               type: 'lent' 
             });
          } else if (daysUntilDue <= notifyOffset || daysUntilDue === 0) {
             reminders.push({ 
               message: `${g.counterparty} owes you ${currency}${remaining.toLocaleString()} (Due ${daysUntilDue === 0 ? 'today' : 'in ' + daysUntilDue + ' days'}).`, 
               amount: remaining, 
               severity: 'info', 
               type: 'lent' 
             });
          }
        }
      } else {
        const lastDate = new Date(g.startDate);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDaysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDaysSinceStart > 0 && diffDaysSinceStart % 30 === 0) {
          if (g.loanType === 'borrowed') {
            reminders.push({ message: `Friendly reminder: You have an active loan from ${g.counterparty} (${currency}${remaining.toLocaleString()}).`, amount: remaining, severity: 'info', type: 'borrowed' });
          } else {
            reminders.push({ message: `${g.counterparty} still owes you ${currency}${remaining.toLocaleString()}.`, amount: remaining, severity: 'info', type: 'lent' });
          }
        }
      }
    });

    return reminders;
  }, [transactions, currency]);

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      const dayIn = dayTransactions.filter(t => t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed')).reduce((acc, t) => acc + t.amount, 0);
      const dayOut = dayTransactions.filter(t => t.type === 'expense' || (t.type === 'loan' && t.loanType === 'lent')).reduce((acc, t) => acc + t.amount, 0);
      
      data.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        in: dayIn,
        out: dayOut
      });
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
                     <TrendingUp size={14} className="text-emerald-300" />
                     Real Income
                  </div>
                  <p className="text-xl font-bold">{currency}{summary.income.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase mb-1">
                     <TrendingDown size={14} className="text-rose-300" />
                     Real Expenses
                  </div>
                  <p className="text-xl font-bold">{currency}{summary.expense.toLocaleString()}</p>
               </div>
            </div>
         </div>
         <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {loanReminders.length > 0 && (
         <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-orange-100 dark:border-orange-900/30 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <HandCoins size={18} className="text-indigo-500" />
               Smart Repayment Alerts
            </h3>
            <div className="space-y-3">
               {loanReminders.map((rem, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all
                     ${rem.severity === 'overdue' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 shadow-sm' : 
                       rem.severity === 'warning' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20' : 
                       'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20'}
                  `}>
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl 
                           ${rem.severity === 'overdue' ? 'bg-rose-100 text-rose-600' : 
                             rem.severity === 'warning' ? 'bg-orange-100 text-orange-600' : 
                             'bg-indigo-100 text-indigo-600'}`}>
                           {rem.severity === 'overdue' ? <AlertCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                           <p className="font-bold text-gray-800 dark:text-white text-sm">
                              {rem.message}
                           </p>
                           <p className={`text-[10px] uppercase font-bold tracking-wider ${rem.type === 'borrowed' ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {rem.type === 'borrowed' ? 'Liability' : 'Receivable'}
                           </p>
                        </div>
                     </div>
                     <span className={`font-extrabold text-lg 
                        ${rem.severity === 'overdue' ? 'text-rose-600' : 
                          rem.severity === 'warning' ? 'text-orange-600' : 
                          'text-indigo-600'}`}>
                        {currency}{rem.amount.toLocaleString()}
                     </span>
                  </div>
               ))}
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 h-[350px]">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white">Cash Flow Trend</h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Inflow
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                   <div className="w-2 h-2 rounded-full bg-rose-500"></div> Outflow
                </div>
             </div>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="in" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
              <Area type="monotone" dataKey="out" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-[350px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <Info size={40} className="opacity-20" />
                <p>No activity yet.</p>
              </div>
            ) : (
              transactions.slice(0, 10).map(t => {
                const isLoan = t.type === 'loan';
                const isInflow = t.type === 'income' || (isLoan && t.loanType === 'borrowed');
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-12 h-12 rounded-2xl flex shrink-0 items-center justify-center ${isInflow ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                        {isLoan ? <HandCoins size={22} /> : isInflow ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{t.description}</p>
                          {isLoan && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-extrabold uppercase">Loan</span>}
                          {t.category === 'Loan Repayment' && <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-[10px] font-extrabold uppercase">Repayment</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{t.category} {t.counterparty ? `• ${t.counterparty}` : ''}</p>
                      </div>
                    </div>
                    <span className={`font-extrabold ml-2 whitespace-nowrap text-lg ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
