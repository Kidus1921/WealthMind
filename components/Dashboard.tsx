import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Plus, MoreHorizontal, HandCoins, Target, ArrowRight, CalendarDays, Sparkles, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const Dashboard: React.FC = () => {
  const { transactions, currency, goals } = useApp();
  const summary = useMemo(() => {
    let income = 0, expense = 0, balance = 0;
    transactions.forEach(t => {
      const inflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
      if (inflow) balance += t.amount; else balance -= t.amount;
      if (t.subtype === 'loan_principal') return;
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, balance, savings: income - expense };
  }, [transactions]);
  const chartData = useMemo(() => {
    const data: { date: string; income: number; expense: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const rows = transactions.filter(t => t.date.startsWith(date));
      data.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        income: rows.filter(t => t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed')).reduce((s,t) => s + t.amount, 0),
        expense: rows.filter(t => t.type === 'expense' || (t.type === 'loan' && t.loanType === 'lent')).reduce((s,t) => s + t.amount, 0)
      });
    }
    return data;
  }, [transactions]);
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { totals[t.category || 'Other'] = (totals[t.category || 'Other'] || 0) + t.amount; });
    return Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, amount]) => ({ name, amount }));
  }, [transactions]);
  const activeLoans = useMemo(() => {
    const groups: Record<string, { name: string; principal: number; repaid: number; type: 'borrowed'|'lent' }> = {};
    transactions.forEach(t => {
      if (!t.counterparty) return;
      let type: 'borrowed'|'lent'|null = null;
      if (t.type === 'loan') type = t.loanType as 'borrowed'|'lent';
      else if (t.category === 'Loan Repayment') type = t.type === 'expense' ? 'borrowed' : 'lent';
      if (!type) return;
      const key = type + ':' + t.counterparty.toLowerCase().trim();
      if (!groups[key]) groups[key] = { name: t.counterparty, principal: 0, repaid: 0, type };
      if (t.type === 'loan' || t.subtype === 'loan_principal') groups[key].principal += t.amount;
      else if (t.subtype === 'loan_repayment' || t.category === 'Loan Repayment') groups[key].repaid += t.amount;
    });
    return Object.values(groups).map(g => ({ ...g, remaining: Math.max(0, g.principal - g.repaid) })).filter(g => g.remaining > 0);
  }, [transactions]);
  const money = (value: number) => `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const recent = transactions.slice(0, 6);
  const totalGoals = goals.reduce((s,g) => s + g.targetAmount, 0);
  const currentGoals = goals.reduce((s,g) => s + g.currentAmount, 0);

  return <div className="space-y-7 pb-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-semibold text-slate-400">Monday, {new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Good to see you again<span className="text-violet-500">.</span></h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here's what's happening with your money.</p></div>
      <div className="flex items-center gap-2"><span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5"><CalendarDays size={14}/> Last 7 days</span><span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Live overview</span></div>
    </div>

    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <div className="wm-balance-card relative overflow-hidden rounded-[28px] p-6 text-white md:col-span-2">
        <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[38px] border-white/[.06]"/><div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"/>
        <div className="relative z-10 flex items-start justify-between"><div><p className="text-xs font-semibold tracking-wide text-white/65">Total balance</p><div className="mt-3 text-4xl font-extrabold tracking-tight sm:text-[42px]">{money(summary.balance)}</div><p className="mt-3 flex items-center gap-2 text-xs text-white/60"><Activity size={14}/> Across your tracked activity</p></div><div className="rounded-2xl bg-white/10 p-3"><Wallet size={21}/></div></div>
        <div className="relative z-10 mt-8 flex flex-wrap gap-8 border-t border-white/15 pt-5"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Income</p><p className="flex items-center gap-1.5 text-sm font-bold"><ArrowDownRight size={16} className="text-emerald-300"/>{money(summary.income)}</p></div><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Expenses</p><p className="flex items-center gap-1.5 text-sm font-bold"><ArrowUpRight size={16} className="text-amber-300"/>{money(summary.expense)}</p></div></div>
      </div>
      <div className="wm-stat-card"><div className="flex items-center justify-between"><span className="wm-stat-icon bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><TrendingUp size={19}/></span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total income</span></div><p className="mt-5 text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">{money(summary.income)}</p><p className="mt-1 text-xs text-slate-400">Money coming in</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-emerald-50 dark:bg-emerald-500/10"><div className="h-full w-3/4 rounded-full bg-emerald-500"/></div></div>
      <div className="wm-stat-card"><div className="flex items-center justify-between"><span className="wm-stat-icon bg-rose-50 text-rose-500 dark:bg-rose-500/10"><TrendingDown size={19}/></span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total expenses</span></div><p className="mt-5 text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">{money(summary.expense)}</p><p className="mt-1 text-xs text-slate-400">Money going out</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-rose-50 dark:bg-rose-500/10"><div className="h-full w-1/2 rounded-full bg-rose-400"/></div></div>
    </section>

    <section className="grid grid-cols-1 gap-5 2xl:grid-cols-3">
      <div className="wm-panel p-6 2xl:col-span-2">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-extrabold text-slate-900 dark:text-white">Cash flow</h3><p className="mt-1 text-xs text-slate-400">Income and expenses over the last 7 days</p></div><div className="flex gap-4 text-[11px] font-semibold text-slate-500"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-violet-500"/> Income</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-amber-400"/> Expenses</span></div></div>
        <div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:8,right:8,left:-18,bottom:0}}><defs><linearGradient id="wmIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient><linearGradient id="wmExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5c66b" stopOpacity={0.2}/><stop offset="95%" stopColor="#f5c66b" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9e7ef"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:11}} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:10}}/><Tooltip contentStyle={{borderRadius:16,border:'1px solid #eeeaf4',boxShadow:'0 12px 30px #24133b12'}}/><Area type="monotone" dataKey="income" name="Income" stroke="#8b5cf6" strokeWidth={3} fill="url(#wmIncome)" activeDot={{r:5}}/><Area type="monotone" dataKey="expense" name="Expense" stroke="#eab65d" strokeWidth={3} fill="url(#wmExpense)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="wm-panel p-6"><div className="flex items-center justify-between"><div><h3 className="text-base font-extrabold text-slate-900 dark:text-white">Savings snapshot</h3><p className="mt-1 text-xs text-slate-400">Your progress at a glance</p></div><span className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10"><Target size={18}/></span></div><div className="mt-7 flex items-end justify-between"><div><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{money(summary.savings)}</p><p className="mt-1 text-xs text-slate-400">Net cash flow</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${summary.savings >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{summary.savings >= 0 ? 'Positive' : 'Negative'}</span></div><div className="my-6 h-px bg-slate-100 dark:bg-white/10"/><div className="flex justify-between text-xs"><span className="text-slate-400">Goals progress</span><span className="font-bold text-slate-700 dark:text-slate-200">{totalGoals ? Math.round(currentGoals/totalGoals*100) : 0}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{width:`${totalGoals ? Math.min(100,currentGoals/totalGoals*100) : 0}%`}}/></div><p className="mt-3 text-[11px] text-slate-400">{money(currentGoals)} saved of {money(totalGoals)} target</p><div className="mt-6 rounded-2xl bg-[#f7f3ff] p-4 dark:bg-violet-500/10"><div className="flex gap-2 text-violet-700 dark:text-violet-300"><Sparkles size={16}/><span className="text-xs font-bold">A little progress adds up.</span></div><p className="mt-1 text-[11px] leading-relaxed text-violet-600/70 dark:text-violet-300/70">Keep tracking your spending to make your next money decision with confidence.</p></div></div>
    </section>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div className="wm-panel p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-base font-extrabold text-slate-900 dark:text-white">Recent transactions</h3><p className="mt-1 text-xs text-slate-400">Your latest financial activity</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:bg-white/10">{transactions.length} records</span></div>
        <div className="space-y-1">{recent.length ? recent.map(t => { const inflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed'); return <div key={t.id} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-white/5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${inflow ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>{t.type === 'loan' ? <HandCoins size={17}/> : inflow ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{t.description || t.category}</span><span className="mt-0.5 block text-[11px] text-slate-400">{t.category} · {new Date(t.date).toLocaleDateString()}</span></span><span className={`text-sm font-extrabold ${inflow ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>{inflow ? '+' : '-'}{money(t.amount)}</span></div>}) : <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400 dark:bg-white/5">No transactions yet. Add your first transaction to see it here.</div>}</div>
      </div>
      <div className="wm-panel p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-base font-extrabold text-slate-900 dark:text-white">Spending categories</h3><p className="mt-1 text-xs text-slate-400">Where your money is going</p></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-500/10"><Wallet size={18}/></span></div>
        {categoryData.length ? <><div className="h-[175px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical" margin={{left:0,right:12,top:0,bottom:0}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={90} tick={{fill:'#9ca3af',fontSize:11}}/><Tooltip cursor={{fill:'#f8f6fb'}} contentStyle={{borderRadius:14,border:'1px solid #eeeaf4'}}/><Bar dataKey="amount" fill="#8b5cf6" radius={[0,7,7,0]} barSize={15}/></BarChart></ResponsiveContainer></div><div className="mt-3 space-y-2">{categoryData.slice(0,3).map((c,i)=><div key={c.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className={`h-2 w-2 rounded-full ${['bg-violet-500','bg-amber-400','bg-emerald-400'][i]}`}/>{c.name}</span><span className="font-bold text-slate-700 dark:text-slate-200">{money(c.amount)}</span></div>)}</div></> : <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400 dark:bg-white/5">Your expense breakdown will appear here.</div>}
      </div>
    </section>

    {activeLoans.length > 0 && <section className="wm-panel p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-base font-extrabold text-slate-900 dark:text-white">Outstanding commitments</h3><p className="mt-1 text-xs text-slate-400">Loans to repay or collect</p></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-500/10"><HandCoins size={18}/></span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeLoans.slice(0,3).map((loan,i)=><div key={i} className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800 dark:text-white">{loan.name}</p><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${loan.type === 'borrowed' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{loan.type === 'borrowed' ? 'Payable' : 'Receivable'}</span></div><p className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">{money(loan.remaining)}</p><p className="mt-1 text-[10px] text-slate-400">Remaining balance</p></div>)}</div></section>}
  </div>;
};
