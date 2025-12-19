
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, CategoryState, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, FinancialGoal, GoalContribution } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface FocusEntity {
  type: 'transaction' | 'goal' | 'loan';
  id: string;
}

interface AppContextProps {
  user: User | null;
  signOut: () => Promise<void>;
  
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  addTransactions: (ts: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => void;
  updateTransaction: (t: Transaction) => void;
  
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  currency: string;
  setCurrency: (c: string) => void;

  categories: CategoryState;
  addCategory: (type: 'income' | 'expense', name: string) => void;
  deleteCategory: (type: 'income' | 'expense', name: string) => void;

  paymentMethods: string[];
  addPaymentMethod: (name: string) => void;
  deletePaymentMethod: (name: string) => void;

  goals: FinancialGoal[];
  addGoal: (goal: FinancialGoal) => void;
  updateGoal: (goal: FinancialGoal) => void;
  deleteGoal: (id: string) => void;
  addGoalContribution: (goalId: string, amount: number, note?: string) => Promise<void>;
  deleteGoalContribution: (goalId: string, logId: string) => Promise<void>;

  focusEntity: FocusEntity | null;
  setFocusEntity: (entity: FocusEntity | null) => void;

  resetData: () => void;
  loading: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrencyState] = useState('$');
  const [categories, setCategories] = useState<CategoryState>(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [focusEntity, setFocusEntity] = useState<FocusEntity | null>(null);
  
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setTransactions([]);
        setGoals([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: txnData } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (txnData) {
          const mappedTxns: Transaction[] = txnData.map((row: any) => ({
            id: row.id,
            amount: row.amount,
            type: row.type,
            loanType: row.loan_type,
            subtype: row.subtype,
            counterparty: row.counterparty,
            category: row.category,
            description: row.description,
            date: row.date,
            dueDate: row.due_date,
            paymentMethod: row.payment_method,
            reason: row.reason,
            isRecurring: row.is_recurring,
            recurrenceFrequency: row.recurrence_frequency,
            nextOccurrence: row.next_occurrence,
            referenceId: row.reference_id,
            createdAt: new Date(row.created_at).getTime()
          }));
          setTransactions(mappedTxns);
        }

        const { data: goalsData } = await supabase
          .from('goals')
          .select('*, goal_logs(*)');
        
        if (goalsData) {
          const mappedGoals: FinancialGoal[] = goalsData.map((row: any) => ({
             id: row.id,
             name: row.name,
             targetAmount: row.target_amount,
             currentAmount: row.current_amount,
             deadline: row.deadline,
             color: row.color,
             isDepositOnly: row.target_amount === 0,
             contributions: (row.goal_logs || []).map((log: any) => ({
                id: log.id,
                goalId: log.goal_id,
                amount: log.amount,
                note: log.note,
                date: log.created_at
             })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          }));
          setGoals(mappedGoals);
        }

        const { data: settingsData } = await supabase
          .from('settings')
          .select('*')
          .limit(1);

        if (settingsData && settingsData.length > 0) {
           const row = settingsData[0];
           setSettingsId(row.id);
           setTheme(row.theme || 'light');
           setCurrencyState(row.currency || '$');
           if (row.income_categories && row.expense_categories) {
             setCategories({
               income: row.income_categories,
               expense: row.expense_categories
             });
           }
           if (row.payment_methods) {
             setPaymentMethods(row.payment_methods);
           }
        } else {
           const { data: newSettings } = await supabase
             .from('settings')
             .insert({
               user_id: user.id,
               theme: 'light',
               currency: '$',
               income_categories: DEFAULT_CATEGORIES.income,
               expense_categories: DEFAULT_CATEGORIES.expense,
               payment_methods: DEFAULT_PAYMENT_METHODS
             })
             .select()
             .single();
             
           if (newSettings) {
             setSettingsId(newSettings.id);
           }
        }
      } catch (error) {
        console.error("Data load error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const addTransaction = async (t: Transaction) => {
    if (!user) return;
    setTransactions(prev => [t, ...prev]);

    const dbPayload = {
      id: t.id,
      user_id: user.id,
      amount: t.amount,
      type: t.type,
      loan_type: t.loanType,
      subtype: t.subtype,
      counterparty: t.counterparty,
      category: t.category,
      description: t.description,
      date: t.date,
      due_date: t.dueDate,
      payment_method: t.paymentMethod,
      reason: t.reason,
      is_recurring: t.isRecurring,
      recurrence_frequency: t.recurrenceFrequency,
      reference_id: t.referenceId,
      created_at: new Date().toISOString()
    };
    await supabase.from('transactions').insert(dbPayload);
  };

  const addTransactions = async (ts: Transaction[]) => {
    if (!user || ts.length === 0) return;
    setTransactions(prev => [...ts, ...prev]);

    const dbPayloads = ts.map(t => ({
      id: t.id,
      user_id: user.id,
      amount: t.amount,
      type: t.type,
      loan_type: t.loanType,
      subtype: t.subtype,
      counterparty: t.counterparty,
      category: t.category,
      description: t.description,
      date: t.date,
      due_date: t.dueDate,
      payment_method: t.paymentMethod,
      reason: t.reason,
      is_recurring: t.isRecurring,
      recurrence_frequency: t.recurrenceFrequency,
      reference_id: t.referenceId,
      created_at: new Date().toISOString()
    }));

    await supabase.from('transactions').insert(dbPayloads);
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const updateTransaction = async (updated: Transaction) => {
    setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));

    const dbPayload = {
      amount: updated.amount,
      type: updated.type,
      loan_type: updated.loanType,
      subtype: updated.subtype,
      counterparty: updated.counterparty,
      category: updated.category,
      description: updated.description,
      date: updated.date,
      due_date: updated.dueDate,
      payment_method: updated.paymentMethod,
      reason: updated.reason,
      is_recurring: updated.isRecurring,
      recurrence_frequency: updated.recurrenceFrequency,
      reference_id: updated.referenceId
    };
    await supabase.from('transactions').update(dbPayload).eq('id', updated.id);
  };

  const updateSettings = async (updates: any) => {
    if (!settingsId || !user) return;
    await supabase.from('settings').update(updates).eq('id', settingsId);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    updateSettings({ currency: c });
  };

  const addCategory = (type: 'income' | 'expense', name: string) => {
    if (!name.trim()) return;
    setCategories(prev => {
      if (prev[type].includes(name.trim())) return prev;
      const newState = { ...prev, [type]: [...prev[type], name.trim()] };
      updateSettings({ income_categories: newState.income, expense_categories: newState.expense });
      return newState;
    });
  };

  const deleteCategory = (type: 'income' | 'expense', name: string) => {
    setCategories(prev => {
      const newState = { ...prev, [type]: prev[type].filter(c => c !== name) };
      updateSettings({ income_categories: newState.income, expense_categories: newState.expense });
      return newState;
    });
  };

  const addPaymentMethod = (name: string) => {
    if (!name.trim()) return;
    setPaymentMethods(prev => {
      if (prev.includes(name.trim())) return prev;
      const newList = [...prev, name.trim()];
      updateSettings({ payment_methods: newList });
      return newList;
    });
  };

  const deletePaymentMethod = (name: string) => {
    setPaymentMethods(prev => {
      const newList = prev.filter(p => p !== name);
      updateSettings({ payment_methods: newList });
      return newList;
    });
  };

  const addGoal = async (goal: FinancialGoal) => {
    if (!user) return;
    const initialLogs: GoalContribution[] = [];
    const now = new Date().toISOString();
    if (goal.currentAmount > 0) {
      initialLogs.push({ id: crypto.randomUUID(), goalId: goal.id, amount: goal.currentAmount, note: 'Starting Balance', date: now });
    }
    setGoals(prev => [...prev, { ...goal, contributions: initialLogs }]);
    const dbPayload = { id: goal.id, user_id: user.id, name: goal.name, target_amount: goal.targetAmount, current_amount: goal.currentAmount, deadline: goal.deadline, color: goal.color };
    await supabase.from('goals').insert(dbPayload);
    if (initialLogs.length > 0) {
      await supabase.from('goal_logs').insert({ id: initialLogs[0].id, goal_id: goal.id, user_id: user.id, amount: initialLogs[0].amount, note: initialLogs[0].note, created_at: initialLogs[0].date });
    }
  };

  const updateGoal = async (updated: FinancialGoal) => {
    setGoals(prev => prev.map(g => g.id === updated.id ? { ...updated, contributions: g.contributions } : g));
    const dbPayload = { name: updated.name, target_amount: updated.targetAmount, current_amount: updated.currentAmount, deadline: updated.deadline, color: updated.color };
    await supabase.from('goals').update(dbPayload).eq('id', updated.id);
  };

  const addGoalContribution = async (goalId: string, amount: number, note?: string) => {
    if (!user) return;
    const newLogId = crypto.randomUUID();
    const now = new Date().toISOString();
    let updatedGoalTotal = 0;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const newContribution: GoalContribution = { id: newLogId, goalId, amount, note, date: now };
        updatedGoalTotal = g.currentAmount + amount;
        return { ...g, currentAmount: updatedGoalTotal, contributions: [newContribution, ...(g.contributions || [])] };
      }
      return g;
    }));
    await supabase.from('goals').update({ current_amount: updatedGoalTotal }).eq('id', goalId);
    await supabase.from('goal_logs').insert({ id: newLogId, goal_id: goalId, user_id: user.id, amount: amount, note: note, created_at: now });
  };

  const deleteGoalContribution = async (goalId: string, logId: string) => {
    if (!user) return;
    let updatedGoalTotal = 0;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const log = goal.contributions?.find(c => c.id === logId);
    if (!log) return;
    updatedGoalTotal = goal.currentAmount - log.amount;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return { ...g, currentAmount: updatedGoalTotal, contributions: g.contributions?.filter(c => c.id !== logId) || [] };
      }
      return g;
    }));
    await supabase.from('goals').update({ current_amount: updatedGoalTotal }).eq('id', goalId);
    await supabase.from('goal_logs').delete().eq('id', logId);
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await supabase.from('goals').delete().eq('id', id);
  };

  const resetData = async () => {
    if (confirm("Are you sure? This will delete ALL your data permanently.")) {
      setTransactions([]);
      setGoals([]);
      setCategories(DEFAULT_CATEGORIES);
      setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      await supabase.from('goal_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (settingsId) {
        await supabase.from('settings').update({ income_categories: DEFAULT_CATEGORIES.income, expense_categories: DEFAULT_CATEGORIES.expense, payment_methods: DEFAULT_PAYMENT_METHODS, theme: 'light', currency: '$' }).eq('id', settingsId);
      }
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, signOut,
      transactions, addTransaction, addTransactions, deleteTransaction, updateTransaction, 
      theme, toggleTheme, 
      currency, setCurrency,
      categories, addCategory, deleteCategory,
      paymentMethods, addPaymentMethod, deletePaymentMethod,
      goals, addGoal, updateGoal, deleteGoal, addGoalContribution, deleteGoalContribution,
      focusEntity, setFocusEntity,
      resetData, loading
    }}>
      {children}
    </AppContext.Provider>
  );
};
