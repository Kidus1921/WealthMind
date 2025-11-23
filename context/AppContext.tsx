
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, AppState, CategoryState, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, FinancialGoal } from '../types';

interface AppContextProps {
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
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
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const STORAGE_KEY = 'wealthmind_data_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrencyState] = useState('$');
  const [categories, setCategories] = useState<CategoryState>(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: AppState = JSON.parse(stored);
      setTransactions(parsed.transactions || []);
      setTheme(parsed.theme || 'light');
      setCurrencyState(parsed.currency || '$');
      setCategories(parsed.categories || DEFAULT_CATEGORIES);
      setPaymentMethods(parsed.paymentMethods || DEFAULT_PAYMENT_METHODS);
      setGoals(parsed.goals || []);
      
      if (parsed.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Save data on change
  useEffect(() => {
    const state: AppState = { transactions, theme, currency, categories, paymentMethods, goals };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [transactions, theme, currency, categories, paymentMethods, goals]);

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
  };

  const addCategory = (type: 'income' | 'expense', name: string) => {
    if (!name.trim()) return;
    setCategories(prev => {
      // Prevent duplicates
      if (prev[type].includes(name.trim())) return prev;
      return {
        ...prev,
        [type]: [...prev[type], name.trim()]
      };
    });
  };

  const deleteCategory = (type: 'income' | 'expense', name: string) => {
    setCategories(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== name)
    }));
  };

  const addPaymentMethod = (name: string) => {
    if (!name.trim()) return;
    setPaymentMethods(prev => {
      // Prevent duplicates
      if (prev.includes(name.trim())) return prev;
      return [...prev, name.trim()];
    });
  };

  const deletePaymentMethod = (name: string) => {
    setPaymentMethods(prev => prev.filter(p => p !== name));
  };

  const addGoal = (goal: FinancialGoal) => {
    setGoals(prev => [...prev, goal]);
  };

  const updateGoal = (updated: FinancialGoal) => {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const resetData = () => {
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    setPaymentMethods(DEFAULT_PAYMENT_METHODS);
    setGoals([]);
    setTheme('light');
    setCurrencyState('$');
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AppContext.Provider value={{ 
      transactions, addTransaction, deleteTransaction, updateTransaction, 
      theme, toggleTheme, 
      currency, setCurrency,
      categories, addCategory, deleteCategory,
      paymentMethods, addPaymentMethod, deletePaymentMethod,
      goals, addGoal, updateGoal, deleteGoal,
      resetData
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
