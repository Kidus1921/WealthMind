
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, CategoryState, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, FinancialGoal, GoalContribution, Trade } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
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

  trades: Trade[];
  addTrade: (trade: Trade) => Promise<void>;
  updateTrade: (trade: Trade) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wm_theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [currency, setCurrencyState] = useState('$');
  const [categories, setCategories] = useState<CategoryState>(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
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
        setTrades([]);
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
        const { data: txnData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
        if (txnData) {
          setTransactions(txnData.map((row: any) => ({
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
            createdAt: new Date(row.created_at).getTime()
          })));
        }

        const { data: goalsData } = await supabase.from('goals').select('*, goal_logs(*)');
        if (goalsData) {
          setGoals(goalsData.map((row: any) => ({
             id: row.id,
             name: row.name,
             targetAmount: row.target_amount,
             currentAmount: row.current_amount,
             deadline: row.deadline,
             color: row.color,
             contributions: (row.goal_logs || []).map((log: any) => ({
                id: log.id,
                goalId: log.goal_id,
                amount: log.amount,
                note: log.note,
                date: log.created_at
             })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          })));
        }

        const { data: settingsData } = await supabase.from('settings').select('*').limit(1);
        if (settingsData && settingsData.length > 0) {
           const row = settingsData[0];
           setSettingsId(row.id);
           setCurrencyState(row.currency || '$');
        }

        const { data: tradesData } = await supabase.from('trades').select('*').order('trade_date', { ascending: false });
        if (tradesData) {
          setTrades(tradesData.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            tradeDate: row.trade_date,
            tradeTime: row.trade_time,
            session: row.session,
            killZone: row.kill_zone,
            symbol: row.symbol,
            type: row.type,
            pnl: row.pnl,
            notes: row.notes,
            createdAt: new Date(row.created_at).getTime()
          })));
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
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.className = theme === 'dark' 
      ? "bg-violet-950 text-violet-50 transition-colors duration-500 antialiased overflow-hidden" 
      : "bg-gray-50 text-slate-800 transition-colors duration-500 antialiased overflow-hidden";
  }, [theme]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const addTransaction = async (t: Transaction) => {
    if (!user) return;
    setTransactions(prev => [t, ...prev]);
    // Fixed: changed t.payment_method to t.paymentMethod
    await supabase.from('transactions').insert({
      id: t.id, user_id: user.id, amount: t.amount, type: t.type,
      loan_type: t.loanType, subtype: t.subtype, counterparty: t.counterparty,
      category: t.category, description: t.description, date: t.date,
      due_date: t.dueDate, payment_method: t.paymentMethod, reason: t.reason,
      is_recurring: t.isRecurring, recurrence_frequency: t.recurrenceFrequency
    });
  };

  const addTransactions = async (ts: Transaction[]) => {
    if (!user || ts.length === 0) return;
    setTransactions(prev => [...ts, ...prev]);
    const payloads = ts.map(t => ({
      id: t.id, user_id: user.id, amount: t.amount, type: t.type,
      category: t.category, description: t.description, date: t.date,
      payment_method: t.paymentMethod
    }));
    await supabase.from('transactions').insert(payloads);
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const updateTransaction = async (updated: Transaction) => {
    setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    await supabase.from('transactions').update({
      amount: updated.amount, type: updated.type, category: updated.category,
      description: updated.description, date: updated.date,
      payment_method: updated.paymentMethod, reason: updated.reason
    }).eq('id', updated.id);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('wm_theme', newTheme);
    
    if (user) {
       await supabase.from('settings').upsert({ user_id: user.id, theme: newTheme }, { onConflict: 'user_id' });
    }
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
  };

  const addCategory = (type: 'income' | 'expense', name: string) => {
    setCategories(prev => ({ ...prev, [type]: [...prev[type], name.trim()] }));
  };

  const deleteCategory = (type: 'income' | 'expense', name: string) => {
    setCategories(prev => ({ ...prev, [type]: prev[type].filter(c => c !== name) }));
  };

  const addPaymentMethod = (name: string) => {
    setPaymentMethods(prev => [...prev, name.trim()]);
  };

  const deletePaymentMethod = (name: string) => {
    setPaymentMethods(prev => prev.filter(p => p !== name));
  };

  const addGoal = async (goal: FinancialGoal) => {
    if (!user) return;
    setGoals(prev => [...prev, { ...goal, contributions: [] }]);
    // Fixed: changed goal.target_amount to goal.targetAmount and goal.current_amount to goal.currentAmount
    await supabase.from('goals').insert({ 
      id: goal.id, 
      user_id: user.id, 
      name: goal.name, 
      target_amount: goal.targetAmount, 
      current_amount: goal.currentAmount, 
      color: goal.color 
    });
  };

  const updateGoal = async (updated: FinancialGoal) => {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
    await supabase.from('goals').update({ name: updated.name, target_amount: updated.targetAmount, current_amount: updated.currentAmount, color: updated.color }).eq('id', updated.id);
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await supabase.from('goals').delete().eq('id', id);
  };

  const addGoalContribution = async (goalId: string, amount: number, note?: string) => {
    if (!user) return;
    const logId = crypto.randomUUID();
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount, contributions: [{ id: logId, goalId, amount, note, date: new Date().toISOString() }, ...(g.contributions || [])] } : g));
    await supabase.from('goal_logs').insert({ id: logId, goal_id: goalId, user_id: user.id, amount, note });
  };

  const deleteGoalContribution = async (goalId: string, logId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const log = goal.contributions?.find(l => l.id === logId);
    if (!log) return;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount - log.amount, contributions: g.contributions?.filter(l => l.id !== logId) } : g));
    await supabase.from('goal_logs').delete().eq('id', logId);
  };

  const addTrade = async (trade: Trade) => {
    if (!user) return;
    setTrades(prev => [trade, ...prev]);
    await supabase.from('trades').insert({
      id: trade.id, user_id: user.id, trade_date: trade.tradeDate,
      trade_time: trade.tradeTime, session: trade.session, kill_zone: trade.killZone,
      symbol: trade.symbol, type: trade.type, pnl: trade.pnl, notes: trade.notes
    });
  };

  const updateTrade = async (updated: Trade) => {
    setTrades(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    await supabase.from('trades').update({
      trade_date: updated.tradeDate, trade_time: updated.tradeTime,
      session: updated.session, kill_zone: updated.killZone,
      symbol: updated.symbol, type: updated.type, pnl: updated.pnl, notes: updated.notes
    }).eq('id', updated.id);
  };

  const deleteTrade = async (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
    await supabase.from('trades').delete().eq('id', id);
  };

  const resetData = async () => {
    if (confirm("Reset everything?")) {
      setTransactions([]);
      setGoals([]);
      setTrades([]);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, signOut,
      transactions, addTransaction, addTransactions, deleteTransaction, updateTransaction, 
      theme, toggleTheme, currency, setCurrency,
      categories, addCategory, deleteCategory,
      paymentMethods, addPaymentMethod, deletePaymentMethod,
      goals, addGoal, updateGoal, deleteGoal, addGoalContribution, deleteGoalContribution,
      trades, addTrade, updateTrade, deleteTrade,
      focusEntity, setFocusEntity,
      resetData, loading
    }}>
      {children}
    </AppContext.Provider>
  );
};
