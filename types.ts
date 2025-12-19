
export type TransactionType = 'income' | 'expense' | 'loan';
export type LoanKind = 'borrowed' | 'lent' | null;
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TransactionSubtype = 'loan_principal' | 'loan_interest' | 'loan_repayment' | null;

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  loanType?: LoanKind; // borrowed or lent
  subtype?: TransactionSubtype;
  counterparty?: string; // Person or Organization for loans/repayments
  category: string;
  description: string; 
  date: string; // ISO String
  dueDate?: string; // Repayment deadline (ISO)
  notes?: string;
  paymentMethod?: string;
  reason?: string; 
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  nextOccurrence?: string; // ISO String
  createdAt: number;
  referenceId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: string;
  insights?: AIInsight[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  note?: string;
  date: string; 
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number; // 0 indicates a deposit-style/savings pot (no target)
  currentAmount: number;
  deadline?: string; 
  color: string;
  contributions?: GoalContribution[];
  isDepositOnly?: boolean; // explicit flag for goals without target
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
  expense: ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Insurance', 'Loan Repayment', 'Other']
};

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Money'];
