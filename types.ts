
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
  category: string;
  description: string; 
  date: string; // Transaction date (ISO)
  dueDate?: string; // Repayment deadline (ISO)
  notes?: string;
  paymentMethod?: string;
  reason?: string; 
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  nextOccurrence?: string; // ISO String
  createdAt: number;
  referenceId?: string;
  counterparty?: string; // Person or Organization for loans/repayments
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
  targetAmount: number;
  currentAmount: number;
  deadline?: string; 
  color: string;
  contributions?: GoalContribution[];
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
  income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Interest Received', 'Other'],
  expense: ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Interest Paid', 'Loan Repayment', 'Other']
};

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Money'];
