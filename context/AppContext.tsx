
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, CategoryState, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, FinancialGoal } from '../types';
import { supabase } from '../services/supabaseClient';
import { Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

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

  resetData: () => void;
  loading: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrencyState] = useState('$');
  const [categories, setCategories] = useState<CategoryState>(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  
  // Internal ID for the settings row in Supabase
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // --- Auth & Data Load ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    // Listen for auth changes
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

  // Fetch Data when user changes
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Transactions (RLS filters by user implicitly if setup, but we trust the DB)
        const { data: txnData } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (txnData) {
          const mappedTxns: Transaction[] = txnData.map((row: any) => ({
            id: row.id,
            amount: row.amount,
            type: row.type,
            category: row.category,
            description: row.description,
            date: row.date,
            paymentMethod: row.payment_method,
            reason: row.reason,
            isRecurring: row.is_recurring,
            recurrenceFrequency: row.recurrence_frequency,
            nextOccurrence: row.next_occurrence,
            createdAt: new Date(row.created_at).getTime()
          }));
          setTransactions(mappedTxns);
        }

        // 2. Fetch Goals
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*');
        
        if (goalsData) {
          const mappedGoals: FinancialGoal[] = goalsData.map((row: any) => ({
             id: row.id,
             name: row.name,
             targetAmount: row.target_amount,
             currentAmount: row.current_amount,
             deadline: row.deadline,
             color: row.color
          }));
          setGoals(mappedGoals);
        }

        // 3. Fetch Settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('*')
          .limit(1); // RLS ensures this is THE user's settings

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
           // Create default settings for this user
           const { data: newSettings } = await supabase
             .from('settings')
             .insert({
               user_id: user.id, // Explicitly link to user
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

  // --- Sync Effects (Theme Class) ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- Actions ---

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const addTransaction = async (t: Transaction) => {
    if (!user) return;
    setTransactions(prev => [t, ...prev]);

    const dbPayload = {
      id: t.id,
      user_id: user.id, // Security: Link to user
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.date,
      payment_method: t.paymentMethod,
      reason: t.reason,
      is_recurring: t.isRecurring,
      recurrence_frequency: t.recurrenceFrequency,
      created_at: new Date().toISOString()
    };
    await supabase.from('transactions').insert(dbPayload);
  };

  const addTransactions = async (ts: Transaction[]) => {
    if (!user || ts.length === 0) return;
    
    // Optimistic UI update
    setTransactions(prev => [...ts, ...prev]);

    const dbPayloads = ts.map(t => ({
      id: t.id,
      user_id: user.id,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.date,
      payment_method: t.paymentMethod,
      reason: t.reason,
      is_recurring: t.isRecurring,
      recurrence_frequency: t.recurrenceFrequency,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('transactions').insert(dbPayloads);
    if (error) {
      console.error("Bulk insert failed:", error);
      // Rollback UI if needed, or show toast (omitted for brevity)
    }
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
      category: updated.category,
      description: updated.description,
      date: updated.date,
      payment_method: updated.paymentMethod,
      reason: updated.reason,
      is_recurring: updated.isRecurring,
      recurrence_frequency: updated.recurrenceFrequency,
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
      const newState = {
        ...prev,
        [type]: [...prev[type], name.trim()]
      };
      updateSettings({ 
        income_categories: newState.income,
        expense_categories: newState.expense
      });
      return newState;
    });
  };

  const deleteCategory = (type: 'income' | 'expense', name: string) => {
    setCategories(prev => {
      const newState = {
        ...prev,
        [type]: prev[type].filter(c => c !== name)
      };
      updateSettings({ 
        income_categories: newState.income,
        expense_categories: newState.expense
      });
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
    setGoals(prev => [...prev, goal]);
    
    const dbPayload = {
      id: goal.id,
      user_id: user.id, // Security: Link to user
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline,
      color: goal.color
    };
    await supabase.from('goals').insert(dbPayload);
  };

  const updateGoal = async (updated: FinancialGoal) => {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));

    const dbPayload = {
      name: updated.name,
      target_amount: updated.targetAmount,
      current_amount: updated.currentAmount,
      deadline: updated.deadline,
      color: updated.color
    };
    await supabase.from('goals').update(dbPayload).eq('id', updated.id);
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
      
      // DB Clear (User scoped)
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      
      if (settingsId) {
        await supabase.from('settings').update({
          income_categories: DEFAULT_CATEGORIES.income,
          expense_categories: DEFAULT_CATEGORIES.expense,
          payment_methods: DEFAULT_PAYMENT_METHODS,
          theme: 'light',
          currency: '$'
        }).eq('id', settingsId);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-white">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-bold">WealthMind</h2>
        <p className="text-sm text-gray-500 mt-2">Securing your session...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      user, signOut,
      transactions, addTransaction, addTransactions, deleteTransaction, updateTransaction, 
      theme, toggleTheme, 
      currency, setCurrency,
      categories, addCategory, deleteCategory,
      paymentMethods, addPaymentMethod, deletePaymentMethod,
      goals, addGoal, updateGoal, deleteGoal,
      resetData, loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
