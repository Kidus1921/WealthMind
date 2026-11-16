import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  LayoutDashboard, Receipt, PieChart, Sparkles, Settings, Menu, X, Moon, Sun,
  Target, LogOut, Bell, Clock, HandCoins, ChevronRight, Search, Plus, Wallet
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
interface AppNotification {
  id: string; originalId: string; title: string; message: string;
  type: 'loan' | 'goal'; severity: 'warning' | 'danger'; dueDate: string; targetTab: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { theme, toggleTheme, user, signOut, transactions, goals, setFocusEntity } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'reports', label: 'Analytics', icon: PieChart },
    { id: 'goals', label: 'Savings goals', icon: Target },
    { id: 'ai', label: 'AI assistant', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const notifications = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date(); const nextWeek = new Date(); nextWeek.setDate(now.getDate() + 7);
    transactions.forEach(t => {
      if (t.type === 'loan' && t.dueDate) {
        const due = new Date(t.dueDate); const overdue = due < now; const near = due <= nextWeek && !overdue;
        if (overdue || near) list.push({ id: `loan-${t.id}`, originalId: t.id, title: overdue ? 'Overdue loan' : 'Upcoming repayment', message: `${t.loanType === 'borrowed' ? 'Pay back' : 'Collect from'} ${t.counterparty || 'someone'}`, type: 'loan', severity: overdue ? 'danger' : 'warning', dueDate: t.dueDate, targetTab: 'transactions' });
      }
    });
    goals.forEach(g => {
      if (g.deadline && g.targetAmount > 0 && g.currentAmount < g.targetAmount) {
        const due = new Date(g.deadline); const overdue = due < now; const near = due <= nextWeek && !overdue;
        if (overdue || near) list.push({ id: `goal-${g.id}`, originalId: g.id, title: overdue ? 'Missed goal deadline' : 'Goal deadline near', message: `"${g.name}" target still pending.`, type: 'goal', severity: overdue ? 'danger' : 'warning', dueDate: g.deadline, targetTab: 'goals' });
      }
    });
    return list.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [transactions, goals]);
  const navigate = (id: string) => { setActiveTab(id); setMobileOpen(false); setShowNotifications(false); };
  const openNotification = (n: AppNotification) => { setFocusEntity({ type: n.type, id: n.originalId }); navigate(n.targetTab); };
  const pageTitle = navItems.find(item => item.id === activeTab)?.label || 'Overview';

  return (
    <div className="wm-shell flex h-screen overflow-hidden">
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`wm-sidebar fixed lg:static inset-y-0 left-0 z-50 flex w-[258px] shrink-0 flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-7 pt-8 pb-9">
          <div className="flex items-center gap-3">
            <div className="wm-brand-mark"><Wallet size={21} strokeWidth={2.5}/></div>
            <div><div className="text-[21px] font-extrabold tracking-tight text-slate-900 dark:text-white">wealth<span className="text-violet-600">mind</span></div><div className="text-[9px] font-bold uppercase tracking-[.24em] text-slate-400">Personal finance</div></div>
            <button className="ml-auto rounded-xl p-2 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)}><X size={19}/></button>
          </div>
        </div>
        <div className="px-5 pb-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-400">Workspace</div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(item => <button key={item.id} onClick={() => navigate(item.id)} className={`wm-nav-item ${activeTab === item.id ? 'active' : ''}`}>
            <item.icon size={19} strokeWidth={activeTab === item.id ? 2.4 : 1.9}/><span>{item.label}</span>{activeTab === item.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-600"/>}
          </button>)}
        </nav>
        <div className="mx-5 mb-5 rounded-[22px] bg-[#1d1d20] p-5 text-white">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-300"><Sparkles size={18}/></div>
          <p className="text-sm font-bold">Make money clearer.</p><p className="mt-1 text-[11px] leading-relaxed text-white/55">Small steps today build stronger financial habits.</p>
          <button onClick={() => navigate('ai')} className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-300">Explore AI insights <ChevronRight size={14}/></button>
        </div>
        <div className="border-t border-slate-200/70 p-4 dark:border-white/10">
          <div className="flex items-center gap-3 rounded-2xl p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">{displayName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800 dark:text-white">{displayName}</p><p className="truncate text-[11px] text-slate-400">{user?.email || 'Personal account'}</p></div>
            <button onClick={signOut} title="Sign out" className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"><LogOut size={17}/></button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="wm-topbar flex h-[82px] shrink-0 items-center justify-between px-5 sm:px-8 xl:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21}/></button>
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Your money, in focus</p><h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{pageTitle}</h1></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-400 xl:flex dark:border-white/10 dark:bg-white/5"><Search size={15}/> <span>Search your finances</span><kbd className="ml-5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] dark:bg-white/10">⌘ K</kbd></div>
            <button onClick={toggleTheme} title="Toggle theme" className="wm-icon-button">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} title="Notifications" className="wm-icon-button relative"><Bell size={18}/>{notifications.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500 dark:border-[#19191d]"/>}</button>
              {showNotifications && <><button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotifications(false)}/><div className="absolute right-0 top-14 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#202025]">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-white/10"><p className="font-bold text-slate-900 dark:text-white">Notifications</p><p className="mt-0.5 text-xs text-slate-400">{notifications.length} reminders need attention</p></div>
                <div className="max-h-80 overflow-y-auto p-2">{notifications.length ? notifications.map(n => <button key={n.id} onClick={() => openNotification(n)} className="flex w-full gap-3 rounded-2xl p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${n.severity === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-600'}`}>{n.type === 'loan' ? <HandCoins size={18}/> : <Target size={18}/>}</span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800 dark:text-white">{n.title}</span><span className="mt-1 block text-xs text-slate-500">{n.message}</span><span className="mt-1 block text-[10px] text-slate-400">Due {new Date(n.dueDate).toLocaleDateString()}</span></span></button>) : <div className="py-10 text-center text-sm text-slate-400"><Clock size={24} className="mx-auto mb-2 opacity-50"/>You're all caught up</div>}</div>
              </div></>}
            </div>
            <div className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white sm:flex">{displayName.charAt(0).toUpperCase()}</div>
          </div>
        </header>
        <main className="wm-main flex-1 overflow-y-auto px-5 py-7 sm:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          <footer className="mx-auto mt-10 flex max-w-[1600px] items-center justify-between border-t border-slate-200/70 py-5 text-[10px] font-medium text-slate-400 dark:border-white/10"><span>© {new Date().getFullYear()} WealthMind</span><span>Build clarity. Grow wealth.</span></footer>
        </main>
      </div>
    </div>
  );
};
