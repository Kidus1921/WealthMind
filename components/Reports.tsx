
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  X, TrendingUp, TrendingDown, DollarSign, Calendar, Tag, FilterX, 
  ArrowUpRight, ArrowDownLeft, Wallet, HandCoins, Info, Sparkles, Loader2,
  ChevronRight, ChevronLeft, Target, AlertTriangle
} from 'lucide-react';
import { Transaction, AIInsight } from '../types.ts';
import { generateFinancialInsights } from '../services/geminiService.ts';

const COLORS = ['#ac53ac', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type DateRangeType = 'today' | 'week' | 'month' | 'last_month' | 'custom';

export const Reports: React.FC = () => {
  const { transactions, currency } = useApp();
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [activeFilter, setActiveFilter] = useState<{ type: 'category' | 'date', value: string, label: string } | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // 1. Get current and previous date bounds
  const bounds = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const prevStart = new Date(now);
    const prevEnd = new Date(now);

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
      prevStart.setDate(start.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setHours(0, 0, 0, 0);
    } else if (dateRange === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      prevStart.setDate(start.getDate() - 7);
      prevEnd.setDate(start.getDate());
    } else if (dateRange === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      prevStart.setMonth(start.getMonth() - 1);
      prevStart.setDate(1);
      prevEnd.setDate(1);
    } else if (dateRange === 'last_month') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      
      prevStart.setMonth(start.getMonth() - 1);
      prevStart.setDate(1);
      prevEnd.setMonth(start.getMonth());
      prevEnd.setDate(1);
      
      return { start, end, prevStart, prevEnd };
    }

    return { start, end: now, prevStart, prevEnd };
  }, [dateRange]);

  // 2. Filter transactions by logic: Exclude loan principal from flow totals
  const currentPeriodTxns = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= bounds.start && d <= bounds.end;
    });
  }, [transactions, bounds]);

  const prevPeriodTxns = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= bounds.prevStart && d <= bounds.prevEnd;
    });
  }, [transactions, bounds]);

  // 3. Totals (strictly excluding loan principal)
  const stats = useMemo(() => {
    const calc = (txns: Transaction[]) => {
      let income = 0;
      let expense = 0;
      txns.forEach(t => {
        if (t.subtype === 'loan_principal') return; // Exclude principal
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expense += t.amount;
      });
      return { income, expense, net: income - expense };
    };

    const current = calc(currentPeriodTxns);
    const prev = calc(prevPeriodTxns);

    const percentChange = prev.expense > 0 ? ((current.expense - prev.expense) / prev.expense) * 100 : 0;

    return { ...current, prevExpense: prev.expense, percentChange };
  }, [currentPeriodTxns, prevPeriodTxns]);

  // 4. Chart Data
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    currentPeriodTxns
      .filter(t => t.type === 'expense' && t.subtype !== 'loan_principal')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentPeriodTxns]);

  const trendData = useMemo(() => {
    const data: Record<string, { income: number, expense: number, date: string }> = {};
    
    // Fill gaps
    const tempDate = new Date(bounds.start);
    while (tempDate <= bounds.end) {
      const s = tempDate.toISOString().split('T')[0];
      data[s] = { income: 0, expense: 0, date: s };
      tempDate.setDate(tempDate.getDate() + 1);
    }

    currentPeriodTxns.forEach(t => {
      const s = t.date.split('T')[0];
      if (data[s]) {
        if (t.subtype === 'loan_principal') return;
        if (t.type === 'income') data[s].income += t.amount;
        else if (t.type === 'expense') data[s].expense += t.amount;
      }
    });

    return Object.values(data).map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [currentPeriodTxns, bounds]);

  // 6. AI Insights Fetching
  useEffect(() => {
    const fetch = async () => {
      if (currentPeriodTxns.length === 0) {
        setInsights([]);
        return;
      }
      setLoadingInsights(true);
      try {
        const res = await generateFinancialInsights(currentPeriodTxns);
        setInsights(res);
      } catch (e) {
        console.error("AI Insight error:", e);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetch();
  }, [currentPeriodTxns]);

  // Handlers
  const handlePieClick = (data: any) => {
    if (data && data.name) {
      setActiveFilter({ type: 'category', value: data.name, label: data.name });
    }
  };

  const handleTrendClick = (data: any) => {
    if (data && data.activeLabel) {
      const rawDate = trendData.find(d => d.displayDate === data.activeLabel)?.date;
      if (rawDate) {
        setActiveFilter({ type: 'date', value: rawDate, label: data.activeLabel });
      }
    }
  };

  const filteredTransactions = useMemo(() => {
    let list = currentPeriodTxns;
    if (activeFilter?.type === 'category') list = list.filter(t => t.category === activeFilter.value);
    if (activeFilter?.type === 'date') list = list.filter(t => t.date.startsWith(activeFilter.value));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPeriodTxns, activeFilter]);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Financial Intelligence</h2>
          <p className="text-sm text-gray-500 dark:text-violet-400 font-medium">Data-driven analysis of your transactions</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-violet-900 p-1 rounded-2xl border border-gray-200 dark:border-violet-800 shadow-sm">
           {(['today', 'week', 'month', 'last_month'] as const).map((r) => (
             <button
               key={r}
               onClick={() => { setDateRange(r); setActiveFilter(null); }}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                 dateRange === r 
                   ? 'bg-white dark:bg-violet-800 text-primary shadow-sm' 
                   : 'text-gray-500 hover:text-gray-700 dark:hover:text-violet-200'
               }`}
             >
               {r.replace('_', ' ')}
             </button>
           ))}
        </div>
      </header>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                 <ArrowDownLeft size={20} />
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400">Total Inflow</span>
           </div>
           <p className="text-3xl font-black text-gray-900 dark:text-white">{currency}{stats.income.toLocaleString()}</p>
           <p className="text-xs text-emerald-500 font-bold mt-2">Excluding Principal</p>
        </div>

        <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center">
                 <ArrowUpRight size={20} />
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400">Total Outflow</span>
           </div>
           <p className="text-3xl font-black text-gray-900 dark:text-white">{currency}{stats.expense.toLocaleString()}</p>
           <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${stats.percentChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {stats.percentChange > 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {Math.abs(stats.percentChange).toFixed(1)}% vs Prev. Period
           </div>
        </div>

        <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                 <Wallet size={20} />
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400">Net Flow</span>
           </div>
           <p className={`text-3xl font-black ${stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.net >= 0 ? '+' : '-'}{currency}{Math.abs(stats.net).toLocaleString()}
           </p>
           <p className="text-xs text-gray-400 font-bold mt-2">Cash Savings</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Spending Distribution */}
         <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
               <Tag size={16} className="text-indigo-500" /> Spending Breakdown
            </h3>
            <div className="h-[300px] flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        onClick={handlePieClick}
                        cursor="pointer"
                        stroke="none"
                     >
                        {categoryData.map((_, index) => (
                           <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [`${currency}${val.toLocaleString()}`, 'Spent']}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Cash Flow Trend */}
         <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
               <Calendar size={16} className="text-indigo-500" /> Daily Cash Flow
            </h3>
            <div className="h-[300px] flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} onClick={handleTrendClick}>
                     <defs>
                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [`${currency}${val.toLocaleString()}`, '']}
                     />
                     <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                     <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* AI Insights Container */}
      <div className="bg-indigo-50 dark:bg-violet-950 border border-indigo-100 dark:border-violet-800 p-6 rounded-3xl">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
               <Sparkles size={18} />
            </div>
            <h3 className="font-black text-primary dark:text-violet-300 text-sm uppercase tracking-widest">Wealth Intelligence Insights</h3>
         </div>
         
         {loadingInsights ? (
            <div className="flex items-center gap-3 text-sm text-indigo-400 font-medium">
               <Loader2 className="animate-spin" size={16} /> Generating context-aware analysis...
            </div>
         ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {insights.map((ins, i) => (
                  <div key={i} className="bg-white/80 dark:bg-violet-900/80 p-4 rounded-2xl flex items-start gap-3 shadow-sm border border-transparent dark:border-violet-800">
                     <div className="mt-1 shrink-0">
                        {ins.type === 'warning' ? <AlertTriangle className="text-rose-500" size={16}/> : 
                         ins.type === 'praise' ? <TrendingUp className="text-emerald-500" size={16}/> : 
                         <Info className="text-indigo-400" size={16}/>}
                     </div>
                     <p className="text-sm text-gray-700 dark:text-violet-100 font-medium leading-relaxed">{ins.message}</p>
                  </div>
               ))}
            </div>
         ) : (
            <p className="text-sm text-indigo-400/60 font-medium italic">Add more transactions to generate AI insights.</p>
         )}
      </div>

      {/* Report Data Table */}
      <div className="bg-white dark:bg-violet-900 rounded-3xl shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden animate-in fade-in duration-500">
         <div className="p-6 border-b border-gray-200 dark:border-violet-800 bg-gray-50 dark:bg-violet-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase text-sm tracking-widest">
               {activeFilter ? <Tag size={18} className="text-primary" /> : <TrendingUp size={18} className="text-primary" />}
               {activeFilter ? `Filtered: ${activeFilter.label}` : 'Current Period Activity'}
            </h3>
            <div className="flex items-center gap-3">
               {activeFilter && (
                  <button 
                     onClick={() => setActiveFilter(null)}
                     className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black flex items-center gap-2"
                  >
                     <FilterX size={14} /> Clear Filter
                  </button>
               )}
            </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50 dark:bg-violet-950">
                  <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 dark:border-violet-800">
                     <th className="p-6">Date</th>
                     <th className="p-6">Description</th>
                     <th className="p-6">Category</th>
                     <th className="p-6 text-right">Amount</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-violet-800">
                  {filteredTransactions.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="p-20 text-center flex flex-col items-center justify-center gap-4 opacity-40">
                           <Info size={40} />
                           <p className="text-xs font-black uppercase tracking-widest">No activity found for this filter</p>
                        </td>
                     </tr>
                  ) : (
                     filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-violet-800/30 transition-all group">
                           <td className="p-6 text-xs text-gray-500 dark:text-violet-400 font-bold">
                              {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                           </td>
                           <td className="p-6">
                              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                 {t.description}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">{t.paymentMethod}</p>
                           </td>
                           <td className="p-6">
                              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-violet-800 text-[10px] font-black uppercase text-gray-600 dark:text-violet-200 border dark:border-violet-700">
                                 {t.category}
                              </span>
                           </td>
                           <td className={`p-6 text-right font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {t.type === 'income' ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
