
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
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (data[dateStr] !== undefined) data[dateStr] += t.amount;
    });
    return Object.entries(data).map(([date, amount]) => ({
      date,
      displayDate: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      amount
    }));
  }, [transactions]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Financial Reports</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Expenses by Category</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${currency}${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Daily Spending Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tick={{fontSize: 10}} />
                <Tooltip formatter={(value: number) => [`${currency}${value}`, 'Spent']} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
