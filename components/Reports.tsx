
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, Tag, 
  ArrowUpRight, ArrowDownLeft, Wallet, Info, Sparkles, Loader2,
  AlertTriangle, Download, Users, List, BrainCircuit, Activity, User, ChevronRight, History, HandCoins,
  Check, Search, Filter, ChevronLeft, ChevronUp, ChevronDown, ChevronsUpDown, X
} from 'lucide-react';
import { Transaction, AIInsight } from '../types.ts';
import { generateFinancialInsights } from '../services/geminiService.ts';

const COLORS = ['#ac53ac', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type ReportTab = 'intelligence' | 'ledger' | 'contacts' | 'ai';
type DateRangeType = 'today' | 'week' | 'month' | 'last_month';
type SortField = 'date' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';

export const Reports: React.FC = () => {
  const { transactions, currency } = useApp();
  const [activeTab, setActiveTab] = useState<ReportTab>('intelligence');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Ledger State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSort, setLedgerSort] = useState<{ field: SortField, direction: SortDirection }>({ field: 'date', direction: 'desc' });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const bounds = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (dateRange === 'today') start.setHours(0, 0, 0, 0);
    else if (dateRange === 'week') { start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0); }
    else if (dateRange === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
    else if (dateRange === 'last_month') { start.setMonth(start.getMonth() - 1); start.setDate(1); start.setHours(0, 0, 0, 0); }
    return { start, end: now };
  }, [dateRange]);

  const currentPeriodTxns = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= bounds.start && d <= bounds.end;
    });
  }, [transactions, bounds]);

  const availableCategoriesInHistory = useMemo(() => {
    const cats = new Set(currentPeriodTxns.map(t => t.category));
    return Array.from(cats).sort();
  }, [currentPeriodTxns]);

  const ledgerProcessed = useMemo(() => {
    let result = [...currentPeriodTxns];
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter);
    if (ledgerSearch.trim()) {
      const s = ledgerSearch.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(s) || 
        t.category.toLowerCase().includes(s) ||
        t.counterparty?.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      let valA: any = a[ledgerSort.field];
      let valB: any = b[ledgerSort.field];
      if (ledgerSort.field === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }
      if (ledgerSort.direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    return result;
  }, [currentPeriodTxns, ledgerSearch, ledgerSort, categoryFilter]);

  const totalPages = Math.ceil(ledgerProcessed.length / itemsPerPage);
  const paginatedLedger = ledgerProcessed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    currentPeriodTxns.forEach(t => {
      if (t.subtype === 'loan_principal') return;
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, net: income - expense };
  }, [currentPeriodTxns]);

  const velocityData = useMemo(() => {
    const dataMap: Record<string, { income: number, expense: number, date: string }> = {};
    const iter = new Date(bounds.start);
    const end = new Date(bounds.end);
    while (iter <= end) {
      const key = iter.toISOString().split('T')[0];
      dataMap[key] = { income: 0, expense: 0, date: iter.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
      iter.setDate(iter.getDate() + 1);
    }
    currentPeriodTxns.forEach(t => {
      if (t.subtype === 'loan_principal') return;
      const key = t.date.split('T')[0];
      if (dataMap[key]) {
        if (t.type === 'income') dataMap[key].income += t.amount;
        else if (t.type === 'expense') dataMap[key].expense += t.amount;
      }
    });
    return Object.values(dataMap);
  }, [currentPeriodTxns, bounds]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    currentPeriodTxns.filter(t => t.type === 'expense' && t.subtype !== 'loan_principal').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [currentPeriodTxns]);

  const contactAnalytics = useMemo(() => {
    const contacts: Record<string, { name: string, borrowed: number, lent: number, repaidSent: number, repaidReceived: number, count: number, loanCount: number }> = {};
    transactions.forEach(t => {
      if (!t.counterparty) return;
      const cp = t.counterparty.trim();
      if (!contacts[cp]) contacts[cp] = { name: cp, borrowed: 0, lent: 0, repaidSent: 0, repaidReceived: 0, count: 0, loanCount: 0 };
      contacts[cp].count++;
      if (t.type === 'loan') {
        contacts[cp].loanCount++;
        if (t.loanType === 'borrowed') contacts[cp].borrowed += t.amount;
        else contacts[cp].lent += t.amount;
      } else if (t.category === 'Loan Repayment') {
        if (t.type === 'expense') contacts[cp].repaidSent += t.amount;
        else contacts[cp].repaidReceived += t.amount;
      }
    });
    return Object.values(contacts).map(c => ({
      ...c,
      net: (c.lent - c.repaidReceived) - (c.borrowed - c.repaidSent)
    })).sort((a, b) => b.count - a.count);
  }, [transactions]);

  useEffect(() => {
    const fetch = async () => {
      if (currentPeriodTxns.length === 0) return;
      setLoadingInsights(true);
      try {
        const res = await generateFinancialInsights(currentPeriodTxns);
        setInsights(res);
      } catch (e) { console.error(e); } finally { setLoadingInsights(false); }
    };
    fetch();
  }, [currentPeriodTxns]);

  const handleExportCSV = () => {
    const dataToExport = ledgerProcessed;
    if (dataToExport.length === 0) return;
    const headers = ['Date', 'Description', 'Counterparty', 'Category', 'Type', 'Amount'];
    const rows = dataToExport.map(t => [new Date(t.date).toLocaleDateString(), t.description.replace(/,/g, ''), t.counterparty || '', t.category, t.type, t.amount]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wealthmind_audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleSort = (field: SortField) => {
    setLedgerSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Intelligence Hub</h2>
          <p className="text-sm text-gray-500 dark:text-violet-400 font-medium">Clear insights from your history</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-violet-900 p-1.5 rounded-2xl border border-gray-200 dark:border-violet-800 shadow-sm overflow-x-auto no-scrollbar w-full md:w-auto">
          {(['week', 'month', 'last_month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${dateRange === r ? 'bg-white dark:bg-violet-800 text-primary shadow-sm' : 'text-gray-400'}`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      <nav className="flex bg-white dark:bg-violet-900 p-1.5 rounded-2xl border border-gray-100 dark:border-violet-800 shadow-sm w-full md:w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'intelligence', icon: Activity, label: 'Flow' },
          { id: 'ledger', icon: List, label: 'History' },
          { id: 'contacts', icon: Users, label: 'Contacts' },
          { id: 'ai', icon: BrainCircuit, label: 'Deep Insight' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as ReportTab); setSelectedContact(null); }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
          >
            <tab.icon size={16} /> <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'intelligence' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Income', val: stats.income, icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Total Expenses', val: stats.expense, icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-50' },
                { label: 'Net Position', val: stats.net, icon: Wallet, color: stats.net >= 0 ? 'text-primary' : 'text-rose-600', bg: 'bg-violet-50' }
              ].map(card => (
                <div key={card.label} className="bg-white dark:bg-violet-900 p-8 rounded-[2rem] border border-gray-100 dark:border-violet-800 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-6">
                    <div className={`w-12 h-12 ${card.bg} dark:bg-opacity-10 ${card.color} rounded-2xl flex items-center justify-center`}>
                      <card.icon size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.label}</span>
                  </div>
                  <p className={`text-4xl font-black tracking-tighter ${card.color}`}>{currency}{Math.abs(card.val).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-violet-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 dark:border-violet-800 shadow-sm group">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                  <Tag size={18} className="text-primary" /> Sector Allocation
                </h3>
                <div className="h-[300px] sm:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white dark:bg-violet-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 dark:border-violet-800 shadow-sm group transition-all hover:shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> Flow Velocity
                </h3>
                <div className="h-[300px] sm:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={velocityData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '11px', fontWeight: 'bold' }} formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']} />
                      <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-violet-900 p-4 sm:p-6 rounded-[2rem] border border-gray-100 dark:border-violet-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Filter by description or payee..." 
                  value={ledgerSearch}
                  onChange={(e) => { setLedgerSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white placeholder:text-gray-400 font-bold transition-all shadow-inner outline-none text-xs" 
                />
              </div>
              <button onClick={handleExportCSV} className="w-full md:w-auto px-6 py-3 bg-gray-900 dark:bg-violet-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl">
                 <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] border border-gray-100 dark:border-violet-800 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-violet-800 flex justify-between items-center bg-gray-50/20 dark:bg-violet-950/20">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">History Feed</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{ledgerProcessed.length} entries</p>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-visible">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-50 dark:border-violet-800/50">
                    <tr>
                      <th className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-violet-800/20 transition-all" onClick={() => toggleSort('date')}>
                        <div className="flex items-center gap-2">Date <ChevronsUpDown size={14}/></div>
                      </th>
                      <th className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-violet-800/20 transition-all" onClick={() => toggleSort('description')}>
                        <div className="flex items-center gap-2">Activity <ChevronsUpDown size={14}/></div>
                      </th>
                      <th className="p-6 relative">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                          Classification <Filter size={14} className={categoryFilter !== 'all' ? 'text-primary' : ''} />
                        </div>
                        {isFilterOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-violet-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-violet-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                               <div className="p-4 border-b border-gray-50 dark:border-violet-700 bg-gray-50 dark:bg-violet-900/40 flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest">Filter Tags</span><X size={12} className="cursor-pointer" onClick={() => setIsFilterOpen(false)} /></div>
                               <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                                  <button onClick={() => { setCategoryFilter('all'); setIsFilterOpen(false); setCurrentPage(1); }} className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${categoryFilter === 'all' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-violet-700 text-gray-400'}`}>All Types</button>
                                  {availableCategoriesInHistory.map(cat => (
                                    <button key={cat} onClick={() => { setCategoryFilter(cat); setIsFilterOpen(false); setCurrentPage(1); }} className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${categoryFilter === cat ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-violet-700 text-gray-400'}`}>{cat}</button>
                                  ))}
                               </div>
                            </div>
                          </>
                        )}
                      </th>
                      <th className="p-6 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-violet-800/20 transition-all" onClick={() => toggleSort('amount')}>
                        <div className="flex items-center justify-end gap-2">Value <ChevronsUpDown size={14}/></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-violet-800/50">
                    {paginatedLedger.length > 0 ? paginatedLedger.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-violet-800/20 transition-all">
                        <td className="p-6 text-xs font-bold text-gray-500 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="p-6">
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1">{t.description}</p>
                          {t.counterparty && <p className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1 mt-0.5"><User size={10}/> {t.counterparty}</p>}
                        </td>
                        <td className="p-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{t.category}</span>
                        </td>
                        <td className={`p-6 text-right font-black text-sm whitespace-nowrap ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.type === 'income' ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="p-20 text-center"><Info className="mx-auto text-gray-200 mb-4" size={48} /><p className="text-xs font-black uppercase text-gray-400 tracking-widest">No matching history</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stack View */}
              <div className="lg:hidden p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-violet-800">
                  <div className="flex gap-2">
                    <button onClick={() => toggleSort('date')} className="p-2 bg-gray-50 dark:bg-violet-950 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">Date <ChevronsUpDown size={12}/></button>
                    <button onClick={() => toggleSort('amount')} className="p-2 bg-gray-50 dark:bg-violet-950 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">Value <ChevronsUpDown size={12}/></button>
                  </div>
                  <div className="relative">
                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`p-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${categoryFilter !== 'all' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-violet-950 text-gray-500'}`}><Filter size={12}/> Class</button>
                    {isFilterOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-violet-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-violet-700 z-50 overflow-hidden">
                           <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                              <button onClick={() => { setCategoryFilter('all'); setIsFilterOpen(false); setCurrentPage(1); }} className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${categoryFilter === 'all' ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-400'}`}>All Types</button>
                              {availableCategoriesInHistory.map(cat => (
                                <button key={cat} onClick={() => { setCategoryFilter(cat); setIsFilterOpen(false); setCurrentPage(1); }} className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${categoryFilter === cat ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-400'}`}>{cat}</button>
                              ))}
                           </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {paginatedLedger.length > 0 ? paginatedLedger.map(t => (
                  <div key={t.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-violet-950/30 border border-gray-100 dark:border-violet-800/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(t.date).toLocaleDateString()}</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight">{t.description}</p>
                        {t.counterparty && <p className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1"><User size={10}/> {t.counterparty}</p>}
                      </div>
                      <p className={`font-black text-sm whitespace-nowrap ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100/50 dark:border-violet-800/30">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{t.category}</span>
                      <span className="text-[9px] font-black text-gray-300 uppercase">{t.type}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center opacity-40"><Info className="mx-auto mb-2" size={32}/><p className="text-[10px] font-black uppercase">Empty Ledger</p></div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t border-gray-50 dark:border-violet-800/50 flex items-center justify-between bg-gray-50/10">
                  <p className="text-[10px] font-black uppercase text-gray-400">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 sm:p-3 rounded-2xl bg-gray-50 dark:bg-violet-950 text-gray-400 disabled:opacity-20 hover:text-primary border dark:border-violet-800"><ChevronLeft size={18} /></button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 sm:p-3 rounded-2xl bg-gray-50 dark:bg-violet-950 text-gray-400 disabled:opacity-20 hover:text-primary border dark:border-violet-800"><ChevronRight size={18} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-8">
            {!selectedContact ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] border border-gray-100 dark:border-violet-800 shadow-sm p-6 sm:p-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                    <Users size={18} className="text-primary" /> Relational Pulse
                  </h3>
                  <div className="space-y-4">
                    {contactAnalytics.map(c => (
                      <div key={c.name} onClick={() => setSelectedContact(c.name)} className="group flex items-center justify-between p-4 sm:p-6 rounded-3xl bg-gray-50 dark:bg-violet-950/40 hover:bg-violet-50 dark:hover:bg-violet-800 transition-all cursor-pointer border border-transparent hover:border-primary/20">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-violet-800 rounded-2xl flex items-center justify-center font-black text-primary text-sm shadow-sm">{c.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">{c.name}</p>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{c.count} txn • {c.loanCount} loans</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] sm:text-sm font-black tracking-tighter ${c.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{c.net >= 0 ? 'Owes you' : 'You owe'}</p>
                          <p className="font-black text-sm sm:text-lg text-gray-900 dark:text-white">{currency}{Math.abs(c.net).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-primary p-8 sm:p-10 rounded-[2.5rem] text-white shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Loan Frequency Leader</p>
                    <h4 className="text-2xl sm:text-3xl font-black tracking-tight">{contactAnalytics[0]?.name || 'No contacts'}</h4>
                    <p className="text-xs font-medium opacity-80 mt-2">Highest number of loan interactions ({contactAnalytics[0]?.loanCount || 0}) recorded.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <button onClick={() => setSelectedContact(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all"><ArrowDownLeft className="rotate-90" size={16} /> Back to Contacts</button>
                <div className="bg-white dark:bg-violet-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 dark:border-violet-800 shadow-sm">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">{selectedContact.charAt(0).toUpperCase()}</div>
                    Audit: {selectedContact}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
                    {[
                      { label: 'Lent', val: contactAnalytics.find(c => c.name === selectedContact)?.lent || 0, color: 'text-emerald-500' },
                      { label: 'Borrowed', val: contactAnalytics.find(c => c.name === selectedContact)?.borrowed || 0, color: 'text-rose-500' },
                      { label: 'Repaid (Sent)', val: contactAnalytics.find(c => c.name === selectedContact)?.repaidSent || 0, color: 'text-gray-400' },
                      { label: 'Repaid (Recv)', val: contactAnalytics.find(c => c.name === selectedContact)?.repaidReceived || 0, color: 'text-gray-400' }
                    ].map(m => (
                      <div key={m.label} className="p-4 sm:p-6 bg-gray-50 dark:bg-violet-950/40 rounded-3xl">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">{m.label}</p>
                        <p className={`text-sm sm:text-xl font-black ${m.color}`}>{currency}{m.val.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">History</h4>
                    <div className="space-y-2">
                      {transactions.filter(t => t.counterparty === selectedContact).map(t => (
                        <div key={t.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-violet-950/20 flex justify-between items-center border dark:border-violet-800/30">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-800 dark:text-white uppercase truncate">{t.description}</p>
                            <p className="text-[9px] font-bold text-gray-400">{new Date(t.date).toLocaleDateString()} • {t.category}</p>
                          </div>
                          <p className={`font-black text-xs sm:text-sm whitespace-nowrap ml-4 ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === 'income' ? '+' : '-'}{currency}{t.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-8">
            <div className="bg-indigo-50 dark:bg-violet-950 border border-indigo-100 dark:border-violet-800 p-6 sm:p-10 rounded-[3rem] shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
               <div className="flex items-center gap-4 sm:gap-6 mb-10">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] bg-primary text-white flex items-center justify-center shadow-xl animate-pulse"><BrainCircuit size={28} /></div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-violet-300 text-lg sm:text-2xl tracking-tight">AI Financial Forensics</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Private Isolated Processing Enabled</p>
                  </div>
               </div>
               {loadingInsights ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-primary" size={32} /><p className="text-xs font-black uppercase tracking-widest text-indigo-400 animate-pulse">Scanning Nodes...</p></div>
               ) : insights.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {insights.map((ins, i) => (
                        <div key={i} className="bg-white dark:bg-violet-900 p-6 sm:p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-sm border border-transparent dark:border-violet-800 hover:border-primary/20 transition-all group">
                           <div className="flex justify-between items-center">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ins.type === 'warning' ? 'bg-rose-50 text-rose-500' : ins.type === 'praise' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-500'}`}>{ins.type === 'warning' ? <AlertTriangle size={20}/> : ins.type === 'praise' ? <TrendingUp size={20}/> : <Info size={20}/>}</div>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${ins.type === 'warning' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{ins.type}</span>
                           </div>
                           <p className="text-sm text-gray-700 dark:text-violet-100 font-bold leading-relaxed">{ins.message}</p>
                           <button className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 group-hover:gap-3 transition-all">Action Recommended <ChevronRight size={12}/></button>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="text-center py-20"><Sparkles size={48} className="mx-auto text-indigo-200 mb-4" /><p className="text-xs font-black uppercase tracking-widest text-indigo-400/60 italic">History required for trend prediction.</p></div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
