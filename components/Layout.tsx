
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
  Info,
  Copy,
  LogOut,
  Bell,
  Clock,
  AlertTriangle,
  HandCoins,
  ArrowRight
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

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { theme, toggleTheme, user, signOut, transactions, goals, setFocusEntity } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Notification Logic: Scan for loans and goals near deadline
  const notifications = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    // 1. Check Loans
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

    // 2. Check Goals
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
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'goals', label: 'Financial Goals', icon: Target },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
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

  const SQL_CODE = `-- SQL Setup script omitted for brevity --`;

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

          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} pt-2`}>
             {!collapsed && user && (
               <div className="flex items-center gap-2 overflow-hidden">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex flex-col min-w-0">
                   <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user.email?.split('@')[0]}</span>
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
        <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300 md:hidden">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white md:hidden">WealthMind</h1>
          </div>

          <div className="flex items-center gap-3 relative">
             <button
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all"
             >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>

             <button 
               onClick={() => setShowNotifications(!showNotifications)}
               className={`p-2 rounded-xl transition-all relative ${showNotifications ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
             >
               <Bell size={20} />
               {notifications.length > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-in zoom-in">
                   {notifications.length}
                 </span>
               )}
             </button>

             {showNotifications && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                 <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 flex justify-between items-center">
                       <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Alerts & Reminders</h3>
                       <button onClick={() => setShowNotifications(false)}><X size={16} className="text-gray-400"/></button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                       {notifications.length === 0 ? (
                         <div className="py-12 text-center">
                            <Clock className="w-10 h-10 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase">No active alerts</p>
                         </div>
                       ) : (
                         notifications.map(n => (
                           <div 
                             key={n.id} 
                             onClick={() => handleNotificationClick(n)}
                             className="p-3 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all flex gap-3 group"
                           >
                              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${n.severity === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>
                                 {n.type === 'loan' ? <HandCoins size={18} /> : <Target size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-xs font-black uppercase tracking-tight ${n.severity === 'danger' ? 'text-rose-500' : 'text-orange-500'}`}>{n.title}</p>
                                 <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{n.message}</p>
                                 <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-gray-400">
                                    <Clock size={10} /> {new Date(n.dueDate).toLocaleDateString()}
                                 </div>
                              </div>
                              <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <ArrowRight size={14} className="text-primary" />
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-100 dark:border-slate-700 text-center">
                         <p className="text-[10px] text-gray-400 font-bold uppercase">Stay on top of your goals!</p>
                      </div>
                    )}
                 </div>
               </>
             )}
          </div>
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
