
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  X, TrendingUp, TrendingDown, DollarSign, Calendar, Tag, FilterX, 
  ArrowUpRight, ArrowDownLeft, Wallet, HandCoins, Info, Sparkles, Loader2,
  ChevronRight, ChevronLeft, Target, AlertTriangle, Download
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
      end.setDate(0);
      
      prevStart.setMonth(start.getMonth() - 1);
      prevStart.setDate(1);
      prevEnd.setMonth(start.getMonth());
      prevEnd.setDate(1);
      
      return { start, end, prevStart, prevEnd };
    }

    return { start, end: now, prevStart, prevEnd };
  }, [dateRange]);

  const currentPeriodTxns = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= bounds.start && d <= bounds.end;
    });
  }, [transactions, bounds]);

  const stats = useMemo(() => {
    const calc = (txns: Transaction[]) => {
      let income = 0;
      let expense = 0;
      txns.forEach(t => {
        if (t.subtype === 'loan_principal') {
          if (t.loanType === 'borrowed') income += t.amount;
          else expense += t.amount;
          return;
        }
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense' || t.type === 'loan') expense += t.amount;
      });
      return { income, expense, net: income - expense };
    };

    const current = calc(currentPeriodTxns);
    const prev = calc(transactions.filter(t => {
      const d = new Date(t.date);
      return d >= bounds.prevStart && d <= bounds.prevEnd;
    }));
    const percentChange = prev.expense > 0 ? ((current.expense - prev.expense) / prev.expense) * 100 : 0;

    return { ...current, prevExpense: prev.expense, percentChange };
  }, [currentPeriodTxns, transactions, bounds]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    // Only look at currentPeriodTxns to ensure chart updates with date range selection
    currentPeriodTxns
      .filter(t => {
        // Filter for outflows (expenses or lending money)
        const isOutflow = t.type === 'expense' || (t.type === 'loan' && t.loanType === 'lent');
        return isOutflow && t.subtype !== 'loan_principal';
      })
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentPeriodTxns]);

  const trendData = useMemo(() => {
    const data: Record<string, { income: number, expense: number, date: string }> = {};
    const iterDate = new Date(bounds.start);
    iterDate.setHours(0, 0, 0, 0);
    const endDate = new Date(bounds.end);
    
    while (iterDate <= endDate) {
      const s = iterDate.toISOString().split('T')[0];
      data[s] = { income: 0, expense: 0, date: s };
      iterDate.setDate(iterDate.getDate() + 1);
    }

    currentPeriodTxns.forEach(t => {
      const s = t.date.split('T')[0];
      if (data[s]) {
        if (t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed')) {
          data[s].income += t.amount;
        } else if (t.type === 'expense' || (t.type === 'loan' && t.loanType === 'lent')) {
          data[s].expense += t.amount;
        }
      }
    });

    return Object.values(data).map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [currentPeriodTxns, bounds]);

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

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      setActiveFilter({ type: 'category', value: data.name, label: data.name });
    }
  };

  const handleTrendClick = (data: any) => {
    if (data && data.activeLabel) {
      const found = trendData.find(d => d.displayDate === data.activeLabel);
      if (found) {
        setActiveFilter({ type: 'date', value: found.date, label: data.activeLabel });
      }
    }
  };

  const filteredTransactions = useMemo(() => {
    let list = currentPeriodTxns;
    if (activeFilter?.type === 'category') list = list.filter(t => t.category === activeFilter.value);
    if (activeFilter?.type === 'date') list = list.filter(t => t.date.startsWith(activeFilter.value));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPeriodTxns, activeFilter]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Payment Method'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description.replace(/,/g, ''),
      t.category,
      t.type,
      t.amount,
      t.paymentMethod || 'N/A'
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                 <ArrowDownLeft size={20} />
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400">Total Inflow</span>
           </div>
           <p className="text-3xl font-black text-gray-900 dark:text-white">{currency}{stats.income.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center">
                 <ArrowUpRight size={20} />
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400">Total Outflow</span>
           </div>
           <p className="text-3xl font-black text-gray-900 dark:text-white">{currency}{stats.expense.toLocaleString()}</p>
           <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${stats.percentChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {stats.percentChange > 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {Math.abs(stats.percentChange).toFixed(1)}% vs Prev
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm flex flex-col group">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Tag size={16} className="text-indigo-500" /> Spending Breakdown
               </h3>
               <span className="text-[9px] font-black text-primary/40 group-hover:text-primary transition-colors uppercase tracking-widest">Select category</span>
            </div>
            <div className="h-[320px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  {categoryData.length > 0 ? (
                    <PieChart>
                      <Pie
                          data={categoryData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                          onClick={handlePieClick}
                          stroke="none"
                      >
                          {categoryData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} className="cursor-pointer hover:opacity-80 transition-opacity" />
                          ))}
                      </Pie>
                      <Tooltip 
                          contentStyle={{ backgroundColor: '#180c18', borderRadius: '16px', border: 'none', color: 'white' }}
                          itemStyle={{ color: '#ac53ac', fontSize: '12px', fontWeight: 'bold' }}
                          formatter={(val: number) => [`${currency}${val.toLocaleString()}`, 'Total']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                    </PieChart>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-sm">
                      <Tag size={40} className="opacity-10 mb-2" />
                      No outflows recorded in this range
                    </div>
                  )}
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white dark:bg-violet-900 p-6 rounded-3xl border border-gray-100 dark:border-violet-800 shadow-sm flex flex-col group">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" /> Daily Cash Flow
               </h3>
               <span className="text-[9px] font-black text-primary/40 group-hover:text-primary transition-colors uppercase tracking-widest">Filter by day</span>
            </div>
            <div className="h-[320px] w-full">
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
                     <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#180c18', borderRadius: '16px', border: 'none', color: 'white', fontSize: '12px' }}
                        formatter={(val: number) => [`${currency}${val.toLocaleString()}`, '']}
                     />
                     <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                     <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      <div className="bg-indigo-50 dark:bg-violet-950 border border-indigo-100 dark:border-violet-800 p-6 rounded-3xl">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
               <Sparkles size={18} />
            </div>
            <h3 className="font-black text-primary dark:text-violet-300 text-sm uppercase tracking-widest">Contextual AI Insights</h3>
         </div>
         {loadingInsights ? (
            <div className="flex items-center gap-3 text-sm text-indigo-400 font-medium animate-pulse">
               <Loader2 className="animate-spin" size={16} /> Processing intelligence...
            </div>
         ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {insights.map((ins, i) => (
                  <div key={i} className="bg-white/80 dark:bg-violet-900/80 p-4 rounded-2xl flex items-start gap-3 shadow-sm border dark:border-violet-800 transition-all hover:scale-[1.01]">
                     <div className="mt-1">
                        {ins.type === 'warning' ? <AlertTriangle className="text-rose-500" size={16}/> : 
                         ins.type === 'praise' ? <TrendingUp className="text-emerald-500" size={16}/> : 
                         <Info className="text-indigo-400" size={16}/>}
                     </div>
                     <p className="text-sm text-gray-700 dark:text-violet-100 font-medium leading-relaxed">{ins.message}</p>
                  </div>
               ))}
            </div>
         ) : (
            <p className="text-sm text-indigo-400/60 font-medium italic">Record more activity for AI forecasting.</p>
         )}
      </div>

      <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden">
         <div className="p-8 border-b border-gray-200 dark:border-violet-800 bg-gray-50 dark:bg-violet-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="min-w-0">
               <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase text-xs tracking-widest mb-1">
                  {activeFilter ? <Tag size={18} className="text-primary" /> : <TrendingUp size={18} className="text-primary" />}
                  {activeFilter ? `Filtered: ${activeFilter.label}` : 'Current Period Activity'}
               </h3>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{filteredTransactions.length} items</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
               {activeFilter && (
                  <button onClick={() => setActiveFilter(null)} className="px-5 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black flex items-center gap-2 uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                     <FilterX size={14} /> Reset
                  </button>
               )}
               <button onClick={handleExportCSV} disabled={filteredTransactions.length === 0} className="flex-1 sm:flex-none px-6 py-3 bg-gray-900 dark:bg-violet-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-violet-700 transition-all shadow-xl disabled:opacity-50">
                  <Download size={14} /> Export CSV
               </button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[700px]">
               <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-violet-500 tracking-widest bg-gray-50/50 dark:bg-violet-950/30 border-b border-gray-100 dark:border-violet-800">
                     <th className="p-6 w-32">Date</th>
                     <th className="p-6 w-auto">Description</th>
                     <th className="p-6 w-40">Category</th>
                     <th className="p-6 w-32 text-right">Value</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-violet-800">
                  {filteredTransactions.length === 0 ? (
                     <tr><td colSpan={4} className="p-20 text-center text-xs font-black uppercase text-gray-400">No data in range</td></tr>
                  ) : (
                     filteredTransactions.map(t => {
                        const isInflow = t.type === 'income' || (t.type === 'loan' && t.loanType === 'borrowed');
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-violet-800/20 transition-all">
                             <td className="p-6 text-xs font-black">{new Date(t.date).toLocaleDateString()}</td>
                             <td className="p-6 truncate font-bold text-sm text-gray-900 dark:text-white">{t.description}</td>
                             <td className="p-6">
                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-block truncate max-w-full ${isInflow ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
                                   {t.category}
                                </span>
                             </td>
                             <td className={`p-6 text-right font-black text-base tracking-tighter ${isInflow ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isInflow ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                             </td>
                          </tr>
                        );
                     })
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
