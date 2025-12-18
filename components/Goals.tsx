
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { FinancialGoal, GoalContribution } from '../types.ts';
import { 
  Target, Plus, Edit2, Trash2, Check, TrendingUp, Calendar, 
  DollarSign, X, Filter, ArrowUpDown, Clock, ChevronRight, 
  History, MessageCircle, MoreVertical, Loader2, AlertTriangle 
} from 'lucide-react';

const COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500'
];

type FilterStatus = 'all' | 'active' | 'completed' | 'overdue';
type SortOption = 'progress' | 'amount' | 'deadline';

export const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal, addGoalContribution, deleteGoalContribution, currency } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [viewingGoal, setViewingGoal] = useState<FinancialGoal | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('progress');

  const processedGoals = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let result = goals.filter(g => {
      const progress = (g.currentAmount / g.targetAmount);
      const isCompleted = progress >= 1;
      let isOverdue = false;
      if (g.deadline && !isCompleted) {
        const deadlineDate = new Date(g.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        isOverdue = deadlineDate < now;
      }
      if (filterStatus === 'completed') return isCompleted;
      if (filterStatus === 'overdue') return isOverdue;
      if (filterStatus === 'active') return !isCompleted && !isOverdue;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'progress') return (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount);
      if (sortBy === 'amount') return b.targetAmount - a.targetAmount;
      if (sortBy === 'deadline') return (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity);
      return 0;
    });

    return result;
  }, [goals, filterStatus, sortBy]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Target className="text-primary" /> Financial Goals</h2>
          <p className="text-gray-500 text-sm mt-1">Track your savings and see your history</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/30"><Plus size={18} /> New Goal</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedGoals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          return (
            <div key={goal.id} onClick={() => { setViewingGoal(goal); setIsDetailOpen(true); }} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden group flex flex-col h-full cursor-pointer hover:shadow-md transition-all">
              <div className={`h-2 w-full ${goal.color}`}></div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{goal.name}</h3>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mt-4"><div className={`h-3 rounded-full ${goal.color}`} style={{ width: `${progress}%` }}></div></div>
                <div className="flex justify-between items-end mt-auto pt-4">
                   <div><p className="text-xs text-gray-500">Saved</p><p className="font-bold text-gray-800 dark:text-white text-lg">{currency}{goal.currentAmount.toLocaleString()}</p></div>
                   <div className="text-right"><p className="text-xs text-gray-500">Target</p><p className="font-medium text-gray-600 dark:text-gray-300">{currency}{goal.targetAmount.toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
