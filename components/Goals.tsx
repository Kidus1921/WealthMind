
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FinancialGoal } from '../types';
import { Target, Plus, Edit2, Trash2, Check, TrendingUp, Calendar, DollarSign, X, Filter, ArrowUpDown, Clock } from 'lucide-react';

const COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500'
];

type FilterStatus = 'all' | 'active' | 'completed' | 'overdue';
type SortOption = 'progress' | 'amount' | 'deadline';

export const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal, currency } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  
  // Filtering & Sorting State
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('progress');

  // Stats
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Filter & Sort Logic
  const processedGoals = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare dates without time

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
      if (sortBy === 'progress') {
        const progA = a.currentAmount / a.targetAmount;
        const progB = b.currentAmount / b.targetAmount;
        return progB - progA; // Descending
      }
      if (sortBy === 'amount') {
        return b.targetAmount - a.targetAmount; // Descending
      }
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Ascending
      }
      return 0;
    });

    return result;
  }, [goals, filterStatus, sortBy]);

  const openForm = (goal?: FinancialGoal) => {
    if (goal) setEditingGoal(goal);
    else setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(id);
    }
  };

  const handleQuickAdd = (goal: FinancialGoal, amount: number) => {
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    updateGoal({ ...goal, currentAmount: newAmount });
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Target className="text-primary" />
            Financial Goals
          </h2>
          <p className="text-gray-500 text-sm mt-1">Track your savings for the future</p>
        </div>
        <button
          onClick={() => openForm()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/30"
        >
          <Plus size={18} />
          New Goal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-500 text-sm">Total Saved</span>
             <DollarSign className="w-5 h-5 text-emerald-500" />
           </div>
           <p className="text-3xl font-bold text-gray-800 dark:text-white">{currency}{totalSaved.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-500 text-sm">Total Target</span>
             <Target className="w-5 h-5 text-blue-500" />
           </div>
           <p className="text-3xl font-bold text-gray-800 dark:text-white">{currency}{totalTarget.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-500 text-sm">Overall Progress</span>
             <TrendingUp className="w-5 h-5 text-purple-500" />
           </div>
           <p className="text-3xl font-bold text-gray-800 dark:text-white">{overallProgress.toFixed(1)}%</p>
           <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mt-3">
              <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
           </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
             {(['all', 'active', 'completed', 'overdue'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize whitespace-nowrap ${
                    filterStatus === status 
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {status}
                </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
           <ArrowUpDown className="w-4 h-4 text-gray-400" />
           <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-lg border-none bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary outline-none"
           >
              <option value="progress">Sort by Progress</option>
              <option value="amount">Sort by Target Amount</option>
              <option value="deadline">Sort by Deadline</option>
           </select>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedGoals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isCompleted = progress >= 100;
          
          // Calculate date status
          let daysLeft = null;
          let isOverdue = false;
          if (goal.deadline) {
            const deadline = new Date(goal.deadline);
            const now = new Date();
            now.setHours(0,0,0,0);
            
            // Time difference in days
            const diffTime = deadline.getTime() - now.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isOverdue = daysLeft < 0 && !isCompleted;
          }

          return (
            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden group flex flex-col h-full animate-in fade-in duration-300">
              <div className={`h-2 w-full ${goal.color}`}></div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        {new Date(goal.deadline).toLocaleDateString()} 
                        {!isCompleted && daysLeft !== null && daysLeft >= 0 && <span className="text-orange-500">({daysLeft} days left)</span>}
                        {isOverdue && <span className="text-rose-500 font-bold ml-1 flex items-center gap-0.5"><Clock size={10}/> Overdue</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openForm(goal)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${goal.color}`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-auto">
                   <div>
                     <p className="text-xs text-gray-500">Saved</p>
                     <p className="font-bold text-gray-800 dark:text-white text-lg">{currency}{goal.currentAmount.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-gray-500">Target</p>
                     <p className="font-medium text-gray-600 dark:text-gray-300">{currency}{goal.targetAmount.toLocaleString()}</p>
                   </div>
                </div>

                {!isCompleted && (
                   <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                      <button 
                        onClick={() => handleQuickAdd(goal, 10)}
                        className="flex-1 py-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        +{currency}10
                      </button>
                      <button 
                        onClick={() => handleQuickAdd(goal, 100)}
                        className="flex-1 py-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        +{currency}100
                      </button>
                      <button 
                         onClick={() => {
                             const amt = prompt('Enter amount to add:');
                             if(amt && !isNaN(Number(amt))) handleQuickAdd(goal, Number(amt));
                         }}
                         className="px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        ...
                      </button>
                   </div>
                )}
                {isCompleted && (
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                       <Check size={12} className="mr-1" /> Goal Reached!
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {processedGoals.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <Target size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No goals found.</p>
            <p className="text-sm">
               {filterStatus === 'all' 
                ? "Create a goal to start tracking your savings journey."
                : `No ${filterStatus} goals found. Try changing the filter.`}
            </p>
            {filterStatus === 'all' && (
              <button
                 onClick={() => openForm()}
                 className="mt-6 px-6 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-primary rounded-lg hover:shadow-md transition-all"
              >
                Create First Goal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Goal Form Modal */}
      {isFormOpen && (
         <GoalForm 
           onClose={() => setIsFormOpen(false)} 
           editGoal={editingGoal || undefined}
           addGoal={addGoal}
           updateGoal={updateGoal}
         />
      )}
    </div>
  );
};

interface FormProps {
  onClose: () => void;
  editGoal?: FinancialGoal;
  addGoal: (g: FinancialGoal) => void;
  updateGoal: (g: FinancialGoal) => void;
}

const GoalForm: React.FC<FormProps> = ({ onClose, editGoal, addGoal, updateGoal }) => {
  const [formData, setFormData] = useState<Partial<FinancialGoal>>(editGoal || {
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: '',
    color: COLORS[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goal: FinancialGoal = {
        id: editGoal?.id || crypto.randomUUID(),
        name: formData.name || 'New Goal',
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount),
        deadline: formData.deadline,
        color: formData.color || COLORS[0]
    };

    if (editGoal) updateGoal(goal);
    else addGoal(goal);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {editGoal ? 'Edit Goal' : 'New Financial Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Dream Vacation"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={formData.targetAmount}
                  onChange={e => setFormData({...formData, targetAmount: Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saved So Far</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.currentAmount}
                  onChange={e => setFormData({...formData, currentAmount: Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date (Optional)</label>
            <input 
              type="date" 
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Theme</label>
             <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                   <button
                     key={c}
                     type="button"
                     onClick={() => setFormData({...formData, color: c})}
                     className={`w-8 h-8 rounded-full ${c} ${formData.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-800' : ''}`}
                   />
                ))}
             </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium"
             >
               Save Goal
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
