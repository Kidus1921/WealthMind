
export type TransactionType = 'income' | 'expense';

export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string; // "Source" for income, "Description" for expense
  date: string; // ISO String
  notes?: string;
  paymentMethod?: string;
  reason?: string; // "Why"
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  nextOccurrence?: string; // ISO String
  createdAt: number;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO String YYYY-MM-DD
  color: string;
}

export interface CategoryState {
  income: string[];
  expense: string[];
}

export interface AppState {
  transactions: Transaction[];
  theme: 'light' | 'dark';
  currency: string;
  categories: CategoryState;
  paymentMethods: string[];
  goals: FinancialGoal[];
}

export interface AIInsight {
  type: 'warning' | 'tip' | 'praise' | 'neutral';
  message: string;
}

export const DEFAULT_CATEGORIES: CategoryState = {
  income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'],
  expense: ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Insurance', 'Other']
};

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Money'];
