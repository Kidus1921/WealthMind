
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRightLeft, HandCoins, Info, AlertCircle, Clock, User, ChevronRight, Activity, Calendar, FileText } from 'lucide-react';
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

  const loanStats = useMemo(() => {
    const groups: Record<string, { 
      principal: number, 
      repaid: number, 
      counterparty: string,
      loanType: 'borrowed' | 'lent',
      lastActivity: string,
      description: string
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
          counterparty: t.counterparty, 
          loanType: typeKey, 
          lastActivity: t.date,
          description: t.description || 'No description provided'
        };
      }

      if (t.type === 'loan' || t.subtype === 'loan_principal') {
        groups[key].principal += t.amount;
        // Keep the most detailed description from the principal entry
        if (t.description && t.description.length > groups[key].description.length) {
            groups[key].description = t.description;
        }
      } else if (t.subtype === 'loan_repayment' || t.category === 'Loan Repayment') {
        groups[key].repaid += t.amount;
      }
      
      if (new Date(t.date) > new Date(groups[key].lastActivity)) {
        groups[key].lastActivity = t.date;
      }
    });

    return Object.values(groups)
      .filter(g => g.principal > 0)
      .map(g => ({
        ...g,
        remaining: g.principal - g.repaid,
        progress: Math.min((g.repaid / g.principal) * 100, 100)
      }))
      .filter(g => g.remaining > 0);
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
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-primary via-purple-600 to-indigo-700 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
               <h3 className="text-indigo-100 font-black uppercase tracking-widest text-xs opacity-80">Available Liquidity</h3>
               <p className="text-5xl md:text-7xl font-black tracking-tighter drop-shadow-sm">{currency}{summary.balance.toLocaleString()}</p>
               <div className="flex items-center gap-2 text-indigo-100/60 text-sm font-bold pt-2">
                  <Activity size={16} /> Updated just now
               </div>
            </div>
            
            <div className="w-full md:w-auto grid grid-cols-2 gap-4">
               <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-inner">
                  <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase mb-2">
                     <TrendingUp size={16} /> Total Inflow
                  </div>
                  <p className="text-2xl font-black">{currency}{summary.income.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-inner">
                  <div className="flex items-center gap-2 text-rose-300 text-[10px] font-black uppercase mb-2">
                     <TrendingDown size={16} /> Total Outflow
                  </div>
                  <p className="text-2xl font-black">{currency}{summary.expense.toLocaleString()}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 group hover:shadow-xl hover:border-primary/20 transition-all duration-500">
          <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2"><HandCoins size={18} className="text-indigo-500" /> Active Commitments</span>
            <ChevronRight size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <div className="space-y-6">
            {loanStats.length > 0 ? loanStats.slice(0, 3).map((loan, idx) => (
              <div key={idx} className="relative group/loan">
                <div className="space-y-3 cursor-help">
                  <div className="flex justify-between items-end">
                    <div className="min-w-0">
                      <p className="font-black text-gray-800 dark:text-white flex items-center gap-2 truncate">
                        {loan.counterparty}
                        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter shrink-0 ${loan.loanType === 'borrowed' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'}`}>
                          {loan.loanType === 'borrowed' ? 'Payable' : 'Receivable'}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-tighter whitespace-nowrap ml-2">
                      {currency}{loan.remaining.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-violet-950 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full transition-all duration-[1500ms] rounded-full ${loan.loanType === 'borrowed' ? 'bg-rose-500 shadow-lg shadow-rose-500/20' : 'bg-emerald-500 shadow-lg shadow-emerald-500/20'}`}
                      style={{ width: `${loan.progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Hover Tooltip Detail - Enhanced with Description */}
                <div className="absolute left-0 bottom-full mb-3 hidden group-hover/loan:block z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-gray-900 dark:bg-violet-800 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 w-64">
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Contract Memo</p>
                          <p className="text-xs font-bold text-violet-200 line-clamp-3 leading-relaxed">
                            {loan.description}
                          </p>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                          <div>
                             <p className="text-[9px] font-black uppercase text-gray-500">Initial</p>
                             <p className="text-sm font-black">{currency}{loan.principal.toLocaleString()}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase text-gray-500">Cleared</p>
                             <p className="text-sm font-black text-emerald-400">{currency}{loan.repaid.toLocaleString()}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase pt-2">
                         <Clock size={12} className="text-violet-500" />
                         Activity: {new Date(loan.lastActivity).toLocaleDateString()}
                       </div>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-gray-900 dark:bg-violet-800 rotate-45 mx-auto -mt-2 border-b border-r border-white/10"></div>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] border-2 border-dashed border-gray-100 dark:border-violet-800 rounded-3xl">
                No active commitments
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 flex flex-col hover:shadow-xl transition-all duration-500">
          <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="text-orange-500" /> Summary Matrix
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between p-5 bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/20 hover:scale-[1.02] transition-transform cursor-default">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center shadow-sm">
                     <TrendingDown size={24} />
                  </div>
                  <p className="text-xs font-black text-rose-800/60 dark:text-rose-200/60 uppercase tracking-widest">Payables</p>
               </div>
               <p className="text-2xl font-black text-rose-600">
                  {currency}{loanStats.filter(l => l.loanType === 'borrowed').reduce((acc, l) => acc + l.remaining, 0).toLocaleString()}
               </p>
            </div>
            <div className="flex items-center justify-between p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 hover:scale-[1.02] transition-transform cursor-default">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shadow-sm">
                     <TrendingUp size={24} />
                  </div>
                  <p className="text-xs font-black text-emerald-800/60 dark:text-emerald-200/60 uppercase tracking-widest">Receivables</p>
               </div>
               <p className="text-2xl font-black text-emerald-600">
                  {currency}{loanStats.filter(l => l.loanType === 'lent').reduce((acc, l) => acc + l.remaining, 0).toLocaleString()}
               </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 lg:col-span-2 xl:col-span-1 h-full min-h-[300px] hover:shadow-xl transition-all duration-500">
          <h3 className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-[0.2em] mb-8">Weekly Velocity</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                   <linearGradient id="colInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#colInc)" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="transparent" strokeWidth={4} strokeDasharray="6 6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Inflow</span>
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Outflow</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-violet-900 p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-violet-800 h-[450px] group transition-all duration-500 hover:shadow-2xl">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 flex justify-between items-center">
            7-Day Cashflow
            <span className="text-xs font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full uppercase tracking-widest">Live Feed</span>
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                  itemStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={0.05} fill="#10b981" strokeWidth={5} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={0.05} fill="#ef4444" strokeWidth={5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-violet-900 p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden flex flex-col h-[450px] transition-all duration-500 hover:shadow-2xl">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 flex justify-between items-center">
            Pulse Log
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latest 10</span>
          </h3>
          <div className="flex-1 overflow-y-auto pr-3 space-y-4 scrollbar-thin">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                 <div className="w-16 h-16 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center"><AlertCircle size={32} /></div>
                 <p className="text-xs font-black uppercase tracking-widest">No activity recorded</p>
              </div>
            ) : transactions.slice(0, 10).map(t => {
              const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
              return (
                <div key={t.id} className="flex items-center justify-between p-5 rounded-3xl bg-gray-50 dark:bg-violet-950/30 hover:bg-white dark:hover:bg-violet-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-violet-800 shadow-sm group">
                  <div className="flex items-center gap-5 overflow-hidden">
                    <div className={`w-12 h-12 rounded-2xl flex shrink-0 items-center justify-center transition-transform group-hover:scale-110 ${isInflow ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                      {t.type === 'loan' ? <HandCoins size={22} /> : isInflow ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 dark:text-white truncate text-sm leading-tight">{t.description}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 truncate">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-black text-lg ml-4 tracking-tighter ${isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
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
