
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Sparkles, 
  Settings, 
  Menu, 
  X,
  Moon,
  Sun,
  Target,
  ChevronLeft,
  ChevronRight,
  Info,
  Copy,
  LogOut,
  User as UserIcon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { theme, toggleTheme, user, signOut } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'goals', label: 'Financial Goals', icon: Target },
    { id: 'ai', label: 'AI Insights', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const SQL_CODE = `-- Run this in your Supabase SQL Editor.
-- This script safely updates your database schema.

-- 1. Create Tables (if they don't exist)

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text,
  description text,
  date timestamp with time zone,
  payment_method text,
  reason text,
  is_recurring boolean default false,
  recurrence_frequency text,
  next_occurrence timestamp with time zone,
  reference_id text,
  created_at timestamp with time zone default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline timestamp with time zone,
  color text
);

-- New Table for Goal Logs (Money History)
create table if not exists public.goal_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  user_id uuid references auth.users(id),
  amount numeric not null,
  note text,
  created_at timestamp with time zone default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  theme text default 'light',
  currency text default '$',
  income_categories jsonb,
  expense_categories jsonb,
  payment_methods jsonb
);

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- 2. Add columns to tables if they're missing (Migrations)

alter table public.transactions 
  add column if not exists user_id uuid references auth.users default auth.uid();
  
alter table public.transactions
  add column if not exists reference_id text;

alter table public.goals 
  add column if not exists user_id uuid references auth.users default auth.uid();

alter table public.settings 
  add column if not exists user_id uuid references auth.users default auth.uid();

alter table public.chat_history 
  add column if not exists user_id uuid references auth.users default auth.uid();

-- 3. Enable RLS

alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.goal_logs enable row level security;
alter table public.settings enable row level security;
alter table public.chat_history enable row level security;

-- 4. Policies

-- Transactions
drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions" on public.transactions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own transactions" on public.transactions;
create policy "Users can insert their own transactions" on public.transactions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions" on public.transactions for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Goals
drop policy if exists "Users can view their own goals" on public.goals;
create policy "Users can view their own goals" on public.goals for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own goals" on public.goals;
create policy "Users can insert their own goals" on public.goals for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own goals" on public.goals;
create policy "Users can update their own goals" on public.goals for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own goals" on public.goals;
create policy "Users can delete their own goals" on public.goals for delete using (auth.uid() = user_id);

-- Goal Logs
drop policy if exists "Users can view their own goal logs" on public.goal_logs;
create policy "Users can view their own goal logs" on public.goal_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own goal logs" on public.goal_logs;
create policy "Users can insert their own goal logs" on public.goal_logs for insert with check (auth.uid() = user_id);

-- Settings
drop policy if exists "Users can view their own settings" on public.settings;
create policy "Users can view their own settings" on public.settings for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.settings;
create policy "Users can insert their own settings" on public.settings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.settings;
create policy "Users can update their own settings" on public.settings for update using (auth.uid() = user_id);

-- Chat History
drop policy if exists "Users can view their own chat history" on public.chat_history;
create policy "Users can view their own chat history" on public.chat_history for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chat messages" on public.chat_history;
create policy "Users can insert their own chat messages" on public.chat_history for insert with check (auth.uid() = user_id);
`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside 
        className={`hidden md:flex flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent whitespace-nowrap overflow-hidden">
              WealthMind
            </h1>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-2 mt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : ''}
              className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-primary' : 'text-gray-500 dark:text-gray-400'} ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
          {/* Info / Schema Button */}
          <button
             onClick={() => setShowSqlModal(true)}
             title="Database Schema"
             className={`flex items-center w-full px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
             <Info className={`w-5 h-5 text-blue-500 ${collapsed ? '' : 'mr-3'}`} />
             {!collapsed && <span className="font-medium text-sm text-gray-600 dark:text-gray-300">DB Schema</span>}
          </button>

          {/* Theme Toggle */}
          {collapsed ? (
            <button
              onClick={toggleTheme}
              className={`
                flex items-center justify-center w-full p-3 rounded-xl transition-all duration-200
                ${theme === 'dark' ? 'bg-slate-700 text-indigo-400' : 'bg-orange-50 text-orange-500'}
              `}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              className={`
                flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 group
                border border-transparent hover:border-gray-200 dark:hover:border-slate-600
                ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-indigo-50/50 text-gray-700'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700 text-indigo-400' : 'bg-white text-orange-500 shadow-sm'}`}>
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <span className="font-medium text-sm">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              
              <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </button>
          )}

          {/* User Profile & Sign Out */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} pt-2`}>
             {!collapsed && user && (
               <div className="flex items-center gap-2 overflow-hidden">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex flex-col min-w-0">
                   <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user.email?.split('@')[0]}</span>
                   <span className="text-xs text-gray-400 truncate w-20">Free Plan</span>
                 </div>
               </div>
             )}
             <button
                onClick={signOut}
                title="Sign Out"
                className={`p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors`}
             >
                <LogOut size={20} />
             </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-20">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">WealthMind</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-10 shadow-lg md:hidden">
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center w-full px-4 py-3 rounded-lg ${
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              <hr className="border-gray-200 dark:border-slate-700 my-2" />
              <button
                 onClick={() => { setShowSqlModal(true); setIsMobileMenuOpen(false); }}
                 className="flex items-center w-full px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                 <Info className="w-5 h-5 mr-3" />
                 Database Schema
              </button>
              <button
                 onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                 className="flex items-center w-full px-4 py-3 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                 <LogOut className="w-5 h-5 mr-3" />
                 Sign Out ({user?.email})
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Info size={20} className="text-primary" />
                Secure Database Setup
              </h3>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900/50">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <strong>Important:</strong> These tables now include <code>user_id</code> columns and Row Level Security (RLS) policies to ensure users can only access their own data.
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Run the following SQL code in your Supabase project's SQL Editor to set up the secure schema.
              </p>
              
              <div className="relative group">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-700">
                  {SQL_CODE}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SQL_CODE);
                    alert("SQL copied to clipboard!");
                  }}
                  className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy to Clipboard"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
