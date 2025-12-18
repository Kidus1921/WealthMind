
import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { X, TrendingUp, DollarSign, Calendar, Tag, FilterX } from 'lucide-react';
import { Transaction } from '../types.ts';

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const Reports: React.FC = () => {
  const { transactions, currency } = useApp();
  const [activeFilter, setActiveFilter] = useState<{ type: 'category' | 'date', value: string, label: string } | null>(null);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const barData = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = d.toISOString().split('T')[0];
      data[str] = 0;
    }
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const dateStr = t.date.split('T')[0];
        if (data[dateStr] !== undefined) {
          data[dateStr] += t.amount;
        }
      });

    return Object.entries(data).map(([date, amount]) => ({
      date,
      displayDate: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      amount
    }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!activeFilter) return [];
    return transactions.filter(t => {
      if (t.type !== 'expense') return false; 
      if (activeFilter.type === 'category') return t.category === activeFilter.value;
      if (activeFilter.type === 'date') return t.date.startsWith(activeFilter.value);
      return false;
    });
  }, [activeFilter, transactions]);

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      setActiveFilter({
        type: 'category',
        value: data.name,
        label: data.name
      });
    }
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      setActiveFilter({
        type: 'date',
        value: payload.date,
        label: payload.displayDate
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Financial Reports</h2>
        {activeFilter && (
          <button 
            onClick={() => setActiveFilter(null)}
            className="flex items-center px-3 py-1.5 text-sm bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg hover:bg-rose-200 transition-colors"
          >
            <FilterX className="w-4 h-4 mr-2" />
            Clear Filter: {activeFilter.label}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Expenses by Category</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={handlePieClick}
                  cursor="pointer"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number) => `${currency}${value.toLocaleString()}`}
                   contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Click a slice to filter details</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">30-Day Spending Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} onClick={handleBarClick} cursor="pointer">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tick={{fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: 'rgba(99, 102, 241, 0.1)'}}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${currency}${value}`, 'Spent']}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
           <p className="text-center text-xs text-gray-400 mt-2">Click a bar to view transactions for that day</p>
        </div>
      </div>

      {activeFilter && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {activeFilter.type === 'category' ? <Tag size={18} /> : <Calendar size={18} />}
              Filtered Results: {activeFilter.label}
            </h3>
            <span className="text-sm text-gray-500">
              Total: {currency}{filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
            </span>
          </div>
          
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                <tr className="text-gray-500 dark:text-gray-400 text-sm">
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">No transactions found for this filter.</td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-white">
                        {t.description}
                      </td>
                      <td className="p-4 text-sm">
                        <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-xs text-gray-600 dark:text-gray-300">
                          {t.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600">
                        -{currency}{t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
