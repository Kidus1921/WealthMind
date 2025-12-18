
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

  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

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
      if (sortBy === 'progress') {
        const progA = a.currentAmount / a.targetAmount;
        const progB = b.currentAmount / b.targetAmount;
        return progB - progA;
      }
      if (sortBy === 'amount') return b.targetAmount - a.targetAmount;
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });

    return result;
  }, [goals, filterStatus, sortBy]);

  const openForm = (e?: React.MouseEvent, goal?: FinancialGoal) => {
    e?.stopPropagation();
    if (goal) setEditingGoal(goal);
    else setEditingGoal(null);
    setIsFormOpen(true);
  };

  const openDetail = (goal: FinancialGoal) => {
    setViewingGoal(goal);
    setIsDetailOpen(true);
  };

  const handleShowDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteGoal(confirmDeleteId);
      setConfirmDeleteId(null);
      if (viewingGoal?.id === confirmDeleteId) setIsDetailOpen(false);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent, goal: FinancialGoal, amount: number) => {
    e.stopPropagation();
    addGoalContribution(goal.id, amount, 'Quick Add');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Target className="text-primary" />
            Financial Goals
          </h2>
          <p className="text-gray-500 text-sm mt-1">Track your savings journey</p>
        </div>
        <button
          onClick={() => openForm()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/30"
        >
          <Plus size={18} />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-500 text-sm font-medium">Total Saved</span>
             <DollarSign className="w-5 h-5 text-emerald-500" />
           </div>
           <p className="text-3xl font-bold text-gray-800 dark:text-white">{currency}{totalSaved.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-500 text-sm font-medium">Total Target</span>
             <Target className="w-5 h-5 text-blue-500" />
           </div>
           <p className="text-3xl font-bold text-gray-800 dark:text-white">{currency}{totalTarget.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-500 text-sm font-medium">Overall Progress</span>
             <TrendingUp className="w-5 h-5 text-purple-500" />
           </div>
           <p className="text-3xl font-bold text-gray-800 dark:text-white">{overallProgress.toFixed(1)}%</p>
           <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mt-3">
              <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
           </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedGoals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isCompleted = progress >= 100;
          
          let daysLeft = null;
          let isOverdue = false;
          if (goal.deadline) {
            const deadline = new Date(goal.deadline);
            const now = new Date();
            now.setHours(0,0,0,0);
            const diffTime = deadline.getTime() - now.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isOverdue = daysLeft < 0 && !isCompleted;
          }

          return (
            <div 
              key={goal.id} 
              onClick={() => openDetail(goal)}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden group flex flex-col h-full animate-in fade-in duration-300 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            >
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
                    <button onClick={(e) => openForm(e, goal)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={(e) => handleShowDeleteConfirm(e, goal.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 font-medium">Progress</span>
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
                     <p className="text-xs text-gray-500 font-medium">Saved</p>
                     <p className="font-bold text-gray-800 dark:text-white text-lg">{currency}{goal.currentAmount.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-gray-500 font-medium">Target</p>
                     <p className="font-medium text-gray-600 dark:text-gray-300">{currency}{goal.targetAmount.toLocaleString()}</p>
                   </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                   <div className="flex gap-1.5">
                      <button 
                        onClick={(e) => handleQuickAdd(e, goal, 10)}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        +{currency}10
                      </button>
                      <button 
                        onClick={(e) => handleQuickAdd(e, goal, 100)}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        +{currency}100
                      </button>
                   </div>
                   <div className="text-primary text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Details <ChevronRight size={14} />
                   </div>
                </div>
              </div>
            </div>
          );
        })}

        {processedGoals.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <Target size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No goals found.</p>
          </div>
        )}
      </div>

      {isFormOpen && (
         <GoalForm 
           onClose={() => setIsFormOpen(false)} 
           editGoal={editingGoal || undefined}
           addGoal={addGoal}
           updateGoal={updateGoal}
         />
      )}

      {isDetailOpen && viewingGoal && (
        <GoalDetailModal 
           goal={goals.find(g => g.id === viewingGoal.id) || viewingGoal}
           onClose={() => setIsDetailOpen(false)}
           onEdit={(e) => { setIsDetailOpen(false); openForm(e, viewingGoal); }}
           onDelete={(e) => { setIsDetailOpen(false); handleShowDeleteConfirm(e, viewingGoal.id); }}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Goal?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalDetailModal: React.FC<{
  goal: FinancialGoal; 
  onClose: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}> = ({ goal, onClose, onEdit, onDelete }) => {
  const { addGoalContribution, deleteGoalContribution, currency } = useApp();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setSubmitting(true);
    await addGoalContribution(goal.id, Number(amount), note);
    setAmount('');
    setNote('');
    setSubmitting(false);
  };

  const handleConfirmDeleteLog = () => {
    if (confirmDeleteLogId) {
      deleteGoalContribution(goal.id, confirmDeleteLogId);
      setConfirmDeleteLogId(null);
    }
  };

  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
        <div className={`w-full md:w-80 p-8 text-white flex flex-col justify-between ${goal.color}`}>
          <div>
            <div className="flex justify-between items-center mb-6">
               <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors md:hidden">
                 <X size={24} />
               </button>
               <h2 className="text-2xl font-bold truncate pr-4">{goal.name}</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-white/70 text-sm mb-1 uppercase tracking-wider font-semibold">Goal Progress</p>
                <p className="text-4xl font-extrabold">{progress.toFixed(0)}%</p>
                <div className="w-full bg-white/30 rounded-full h-2.5 mt-2">
                  <div className="bg-white h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                   <p className="text-white/70 text-[10px] uppercase font-bold">Current</p>
                   <p className="text-xl font-bold">{currency}{goal.currentAmount.toLocaleString()}</p>
                </div>
                <div>
                   <p className="text-white/70 text-[10px] uppercase font-bold">Goal</p>
                   <p className="text-xl font-bold">{currency}{goal.targetAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
             <button 
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all font-bold text-sm"
             >
                <Edit2 size={16} /> Edit Goal
             </button>
             <button 
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 py-3 text-white/70 hover:text-white transition-all text-xs font-bold"
             >
                <Trash2 size={14} /> Remove Goal
             </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden relative">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex justify-between items-center shrink-0">
             <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 uppercase">
               <History className="text-primary" size={20} />
               History
             </h3>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors hidden md:block">
               <X size={24} className="text-gray-400" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Add Contribution</p>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                       <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input type="number" required placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div className="relative">
                       <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input type="text" placeholder="Comment" value={note} onChange={e => setNote(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                     <button type="submit" disabled={submitting || !amount} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50">
                        {submitting ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                        Add Funds
                     </button>
                  </div>
                </form>
             </div>

             <div className="space-y-3">
                {goal.contributions && goal.contributions.length > 0 ? (
                   goal.contributions.map(log => (
                      <div key={log.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex justify-between items-center group">
                         <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"><TrendingUp size={18} /></div>
                            <div>
                               <p className="font-bold text-gray-800 dark:text-white text-sm">+{currency}{log.amount.toLocaleString()}</p>
                               <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                  <span>{new Date(log.date).toLocaleDateString()}</span>
                                  {log.note && (<span>• {log.note}</span>)}
                               </div>
                            </div>
                         </div>
                         <button onClick={() => setConfirmDeleteLogId(log.id)} className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"><Trash2 size={16} /></button>
                      </div>
                   ))
                ) : (
                   <div className="text-center py-12 text-gray-400">
                      <p className="text-sm">No entries yet.</p>
                   </div>
                )}
             </div>
          </div>

          {confirmDeleteLogId && (
            <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200 z-10">
               <AlertTriangle size={48} className="text-rose-500 mb-4" />
               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Log Entry?</h3>
               <div className="flex gap-4 w-full max-w-xs mt-6">
                  <button onClick={() => setConfirmDeleteLogId(null)} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium">Cancel</button>
                  <button onClick={handleConfirmDeleteLog} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium">Delete</button>
               </div>
            </div>
          )}
        </div>
      </div>
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
        name: formData.name || 'Untitled Goal',
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {editGoal ? 'Edit Goal' : 'Create Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Goal Name</label>
            <input type="text" required placeholder="e.g. Save for a Car" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target Amount</label>
                <input type="number" required min="1" value={formData.targetAmount} onChange={e => setFormData({...formData, targetAmount: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Initial Saved</label>
                <input type="number" min="0" value={formData.currentAmount} onChange={e => setFormData({...formData, currentAmount: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target Date</label>
            <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Icon Color</label>
             <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                   <button key={c} type="button" onClick={() => setFormData({...formData, color: c})} className={`w-8 h-8 rounded-full ${c} ${formData.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-800' : ''}`} />
                ))}
             </div>
          </div>
          <div className="pt-6 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-gray-600 font-bold">Cancel</button>
             <button type="submit" className="flex-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">Save Goal</button>
          </div>
        </form>
      </div>
    </div>
  );
};
