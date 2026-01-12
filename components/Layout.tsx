
import React, { useState, useMemo } from 'react';
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
  LogOut,
  Bell,
  Clock,
  HandCoins,
  Database,
  Copy,
  Check
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface AppNotification {
  id: string;
  originalId: string;
  title: string;
  message: string;
  type: 'loan' | 'goal';
  severity: 'warning' | 'danger';
  dueDate: string;
  targetTab: string;
}

const SQL_SCHEMA = `-- WealthMind Database Schema (PostgreSQL/Supabase)
-- Ensure the uuid-ossp extension is enabled for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- income, expense, loan
  loan_type VARCHAR(20), -- borrowed, lent
  subtype VARCHAR(30), -- loan_principal, loan_repayment, etc.
  category VARCHAR(50),
  counterparty VARCHAR(100),
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  reason TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_frequency VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Goals Table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  deadline TIMESTAMP WITH TIME ZONE,
  color VARCHAR(30),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Goal Logs (Contributions)
CREATE TABLE IF NOT EXISTS goal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users NOT NULL,
  currency VARCHAR(10) DEFAULT '$',
  theme VARCHAR(10) DEFAULT 'light',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Chat Infrastructure
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  role VARCHAR(10), -- ai, user
  content TEXT,
  insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;`;

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { theme, toggleTheme, user, signOut, transactions, goals, setFocusEntity } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const notifications = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    transactions.forEach(t => {
      if (t.type === 'loan' && t.dueDate) {
        const dueDate = new Date(t.dueDate);
        const isOverdue = dueDate < now;
        const isNear = dueDate <= nextWeek && !isOverdue;

        if (isOverdue || isNear) {
          list.push({
            id: `loan-${t.id}`,
            originalId: t.id,
            title: isOverdue ? 'Overdue Loan' : 'Upcoming Repayment',
            message: `${t.loanType === 'borrowed' ? 'Pay back' : 'Collect from'} ${t.counterparty || 'someone'}`,
            type: 'loan',
            severity: isOverdue ? 'danger' : 'warning',
            dueDate: t.dueDate,
            targetTab: 'transactions'
          });
        }
      }
    });

    goals.forEach(g => {
      if (g.deadline && g.targetAmount > 0 && g.currentAmount < g.targetAmount) {
        const deadline = new Date(g.deadline);
        const isOverdue = deadline < now;
        const isNear = deadline <= nextWeek && !isOverdue;

        if (isOverdue || isNear) {
          list.push({
            id: `goal-${g.id}`,
            originalId: g.id,
            title: isOverdue ? 'Missed Goal Deadline' : 'Goal Deadline Near',
            message: `"${g.name}" target still pending.`,
            type: 'goal',
            severity: isOverdue ? 'danger' : 'warning',
            dueDate: g.deadline,
            targetTab: 'goals'
          });
        }
      }
    });

    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [transactions, goals]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'History', icon: Receipt },
    { id: 'reports', label: 'Analysis', icon: PieChart },
    { id: 'goals', label: 'Targets', icon: Target },
    { id: 'ai', label: 'Assistant', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    setShowNotifications(false);
  };

  const handleNotificationClick = (n: AppNotification) => {
    setFocusEntity({ type: n.type as 'loan' | 'goal', id: n.originalId });
    handleNavClick(n.targetTab);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-violet-950 overflow-hidden font-sans transition-colors duration-500">
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop (Static) and Mobile (Drawer) */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 flex flex-col bg-white dark:bg-violet-900/80 border-r border-gray-200 dark:border-violet-800/50 backdrop-blur-xl transition-all duration-500 ease-in-out z-[60] lg:z-30 ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        <div className={`p-8 flex items-center shrink-0 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <h1 className={`text-2xl font-black bg-gradient-to-r from-violet-500 via-plum-500 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
            WealthMind
          </h1>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-violet-200 hover:bg-gray-100 dark:hover:bg-violet-800 transition-all">
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-violet-200 transition-all">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center w-full px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id
                  ? 'bg-primary text-white shadow-lg shadow-violet-500/30'
                  : 'text-gray-500 dark:text-violet-300 hover:bg-gray-100 dark:hover:bg-violet-800/50'
              } ${collapsed ? 'lg:justify-center' : ''}`}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'} ${collapsed ? 'lg:mr-0' : 'mr-3'}`} />
              <span className={`font-bold tracking-tight whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100 dark:border-violet-800/50 space-y-4 shrink-0">
          <div className={`flex items-center ${collapsed ? 'lg:justify-center' : 'justify-between'} pt-2`}>
             <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-plum-600 flex items-center justify-center text-white text-sm font-black shrink-0">
                  {displayName.charAt(0).toUpperCase()}
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="text-sm font-bold text-gray-800 dark:text-violet-50 truncate">{displayName}</span>
               </div>
             </div>
             <button onClick={signOut} className="p-2.5 text-gray-400 hover:text-plum-500 hover:bg-plum-50 dark:hover:bg-plum-900/20 rounded-xl transition-all" title="Sign Out">
                <LogOut size={20} />
             </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="glass flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-violet-800/50 z-40 sticky top-0 transition-all duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2.5 bg-gray-100 dark:bg-violet-900 rounded-xl text-gray-600 dark:text-violet-300 lg:hidden active:scale-95 hover:bg-gray-200 dark:hover:bg-violet-800 transition-all"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-black bg-gradient-to-r from-violet-500 to-plum-500 bg-clip-text text-transparent lg:hidden truncate">
              WealthMind
            </h1>
            <h1 className="hidden lg:block text-sm font-black text-gray-400 uppercase tracking-widest">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 relative">
             <button onClick={() => setShowSchema(true)} className="p-2 sm:p-2.5 bg-gray-50 dark:bg-violet-900 text-gray-500 dark:text-violet-400 hover:text-primary rounded-xl transition-all group" title="Database Infrastructure">
                <Database size={18} className="sm:w-5 sm:h-5" />
             </button>
             <button onClick={toggleTheme} className="p-2 sm:p-2.5 bg-gray-50 dark:bg-violet-900 text-gray-500 dark:text-violet-400 hover:text-primary rounded-xl transition-all group">
                {theme === 'dark' ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
             </button>
             <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 sm:p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-violet-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-violet-800'}`}>
               <Bell size={18} className="sm:w-5 sm:h-5" />
               {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-plum-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-violet-900 animate-pulse">{notifications.length}</span>}
             </button>

             {showNotifications && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                 <div className="absolute right-0 top-14 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-violet-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-violet-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-gray-100 dark:border-violet-800 bg-gray-50 dark:bg-violet-950/30 flex justify-between items-center">
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Alerts & Reminders</h3>
                       <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <div className="max-h-[450px] overflow-y-auto p-3 space-y-2 scrollbar-thin">
                       {notifications.length === 0 ? (
                         <div className="py-16 text-center">
                            <Clock className="w-12 h-12 text-gray-200 dark:text-violet-700 mx-auto mb-4" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Everything is up to date</p>
                         </div>
                       ) : (
                         notifications.map(n => (
                           <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-4 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-violet-800 hover:bg-gray-50 dark:hover:bg-violet-800/50 cursor-pointer transition-all flex gap-4 group">
                              <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${n.severity === 'danger' ? 'bg-plum-100 text-plum-600 dark:bg-plum-900/40' : 'bg-lemon-100 text-lemon-700 dark:bg-lemon-900/40'}`}>
                                 {n.type === 'loan' ? <HandCoins size={20} /> : <Target size={20} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${n.severity === 'danger' ? 'text-plum-500' : 'text-lemon-600'}`}>{n.title}</p>
                                 <p className="text-sm font-bold text-gray-800 dark:text-violet-50 leading-snug">{n.message}</p>
                                 <div className="flex items-center gap-1.5 mt-2 text-[10px] font-black text-gray-400 uppercase">
                                    <Clock size={12} /> Due {new Date(n.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </div>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
               </>
             )}
          </div>
        </header>

        {showSchema && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-violet-800 overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-violet-800 flex justify-between items-center shrink-0">
                   <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                         <Database className="text-primary shrink-0" /> <span className="truncate">Database Infrastructure</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-violet-400 font-medium mt-1">Idempotent IF NOT EXISTS SQL Definition</p>
                   </div>
                   <div className="flex gap-2 sm:gap-3">
                      <button 
                        onClick={handleCopySchema} 
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                      >
                         {copied ? <Check size={14} /> : <Copy size={14} />}
                         <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy SQL'}</span>
                      </button>
                      <button onClick={() => setShowSchema(false)} className="p-2 sm:p-3 bg-gray-100 dark:bg-violet-800 text-gray-500 dark:text-violet-300 rounded-2xl hover:bg-gray-200 dark:hover:bg-violet-700 transition-all">
                         <X size={20} />
                      </button>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin bg-gray-50 dark:bg-violet-950/50">
                   <pre className="text-[11px] sm:text-sm font-mono text-gray-700 dark:text-violet-200 p-4 sm:p-6 rounded-3xl bg-white dark:bg-violet-900 border border-gray-200 dark:border-violet-800 overflow-x-auto leading-relaxed shadow-inner">
                      {SQL_SCHEMA}
                   </pre>
                </div>
             </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 relative scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto h-full space-y-8 animate-in fade-in duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
