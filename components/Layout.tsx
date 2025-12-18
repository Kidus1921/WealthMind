
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
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
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const SQL_CODE = `-- 1. CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now()
);

-- 2. CHAT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user', 'ai')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. CRITICAL: ENSURE NEW COLUMNS EXIST (Fixes 'column session_id does not exist')
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS insights jsonb DEFAULT '[]';

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- 5. RE-CREATE POLICIES (Users can only access their own data)
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own history" ON public.chat_history;
CREATE POLICY "Users can manage their own history" ON public.chat_history
  FOR ALL USING (auth.uid() = user_id);

-- 6. CORE APP TABLES (TRANSACTIONS & GOALS)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'loan'));

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS loan_type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subtype text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS counterparty text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  deadline timestamp with time zone,
  color text
);

CREATE TABLE IF NOT EXISTS public.goal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  theme text DEFAULT 'light',
  currency text DEFAULT '$',
  income_categories jsonb,
  expense_categories jsonb,
  payment_methods jsonb
);
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
          <button
             onClick={() => setShowSqlModal(true)}
             title="Database Schema"
             className={`flex items-center w-full px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
             <Info className={`w-5 h-5 text-blue-500 ${collapsed ? '' : 'mr-3'}`} />
             {!collapsed && <span className="font-medium text-sm text-gray-600 dark:text-gray-300">DB Schema</span>}
          </button>

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
              {!collapsed && <span className="font-medium text-sm">Theme</span>}
            </div>
            {!collapsed && (
              <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            )}
          </button>

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

      {/* Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-20">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">WealthMind</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-10 shadow-lg md:hidden">
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center w-full px-4 py-3 rounded-lg ${activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              <hr className="border-gray-200 dark:border-slate-700 my-2" />
              <button onClick={() => { signOut(); setIsMobileMenuOpen(false); }} className="flex items-center w-full px-4 py-3 rounded-lg text-rose-600 dark:text-rose-400"><LogOut className="w-5 h-5 mr-3" /> Sign Out</button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Info size={20} className="text-primary" />
                Database Setup
              </h3>
              <button onClick={() => setShowSqlModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900/50">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-700 relative group">
                {SQL_CODE}
                <button onClick={() => { navigator.clipboard.writeText(SQL_CODE); alert("SQL copied!"); }} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={16} /></button>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
