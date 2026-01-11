
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TradeJournalForm } from './TradeJournalForm.tsx';
import { Trade } from '../types.ts';
import { Search, Plus, Trash2, Edit2, TrendingUp, TrendingDown, Clock, Globe, Target, AlertTriangle, ChevronRight, Activity } from 'lucide-react';

export const TradeJournal: React.FC = () => {
  const { trades, deleteTrade, currency } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let profit = 0;
    let loss = 0;
    let winCount = 0;
    trades.forEach(t => {
      if (t.pnl >= 0) {
        profit += t.pnl;
        winCount++;
      } else {
        loss += Math.abs(t.pnl);
      }
    });
    const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
    return { profit, loss, net: profit - loss, winRate };
  }, [trades]);

  const filteredTrades = trades.filter(t => 
    t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.session.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-gray-900 dark:text-violet-50 tracking-tight">Trade Journal</h2>
           <p className="text-gray-500 dark:text-violet-400 font-medium text-sm">Auditing {trades.length} historical executions</p>
        </div>
        <button onClick={() => { setEditingTrade(undefined); setIsFormOpen(true); }} className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-violet-600 shadow-2xl shadow-violet-500/30 transition-all flex items-center justify-center gap-3 active:scale-95">
          <Plus size={18} /> Log New Trade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2rem] border border-gray-100 dark:border-violet-800 shadow-sm">
           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Total Net P&L</p>
           <p className={`text-3xl font-black tracking-tighter ${stats.net >= 0 ? 'text-evergreen-600' : 'text-plum-600'}`}>
             {stats.net >= 0 ? '+' : '-'}{currency}{Math.abs(stats.net).toLocaleString()}
           </p>
        </div>
        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2rem] border border-gray-100 dark:border-violet-800 shadow-sm">
           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Win Rate</p>
           <p className="text-3xl font-black tracking-tighter text-violet-600 dark:text-violet-300">
             {stats.winRate.toFixed(1)}%
           </p>
        </div>
        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2rem] border border-gray-100 dark:border-violet-800 shadow-sm">
           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Gross Profit</p>
           <p className="text-3xl font-black tracking-tighter text-evergreen-600">
             {currency}{stats.profit.toLocaleString()}
           </p>
        </div>
        <div className="bg-white dark:bg-violet-900 p-8 rounded-[2rem] border border-gray-100 dark:border-violet-800 shadow-sm">
           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Gross Loss</p>
           <p className="text-3xl font-black tracking-tighter text-plum-600">
             {currency}{stats.loss.toLocaleString()}
           </p>
        </div>
      </div>

      <div className="bg-white dark:bg-violet-900 p-5 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by Symbol, Notes or Session..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white placeholder-gray-400 text-sm shadow-inner outline-none transition-all" 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-violet-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 dark:bg-violet-950/30 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] border-b border-gray-100 dark:border-violet-800">
              <tr>
                <th className="p-8">Execution</th>
                <th className="p-8">Environment</th>
                <th className="p-8 text-right">P&L Result</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-violet-800/50">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                       <Activity size={64} />
                       <p className="font-black uppercase tracking-[0.3em] text-xs">No execution history found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map(trade => (
                  <tr key={trade.id} className="hover:bg-violet-50/30 dark:hover:bg-violet-800/20 transition-all group">
                    <td className="p-8">
                       <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${trade.type === 'Buy' ? 'bg-evergreen-100 text-evergreen-600 dark:bg-evergreen-900/40' : 'bg-plum-100 text-plum-600 dark:bg-plum-900/40'}`}>
                             {trade.type === 'Buy' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          </div>
                          <div>
                             <p className="text-lg font-black text-gray-900 dark:text-violet-50 tracking-tight">{trade.symbol}</p>
                             <div className="flex items-center gap-3 mt-1">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${trade.type === 'Buy' ? 'bg-evergreen-50 text-evergreen-600 dark:bg-evergreen-900/20' : 'bg-plum-50 text-plum-600 dark:bg-plum-900/20'}`}>{trade.type}</span>
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{new Date(trade.tradeDate).toLocaleDateString()} @ {trade.tradeTime}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="p-8">
                       <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-violet-100 dark:bg-violet-800 text-violet-600 dark:text-violet-300 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm border border-violet-200 dark:border-violet-700">
                             <Globe size={12} /> {trade.session}
                          </span>
                          {trade.killZone !== 'None' && (
                            <span className="px-3 py-1 bg-lemon-50 dark:bg-lemon-900/20 text-lemon-600 dark:text-lemon-400 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm border border-lemon-100 dark:border-lemon-900/30">
                               <Target size={12} /> {trade.killZone}
                            </span>
                          )}
                       </div>
                    </td>
                    <td className={`p-8 text-right font-black text-xl tracking-tighter ${trade.pnl >= 0 ? 'text-evergreen-500' : 'text-plum-500'}`}>
                       {trade.pnl >= 0 ? '+' : '-'}{currency}{Math.abs(trade.pnl).toLocaleString()}
                    </td>
                    <td className="p-8 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                          <button onClick={() => { setEditingTrade(trade); setIsFormOpen(true); }} className="p-3 text-gray-400 hover:text-primary hover:bg-violet-50 dark:hover:bg-violet-800 rounded-2xl transition-all active:scale-90">
                             <Edit2 size={18} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(trade.id)} className="p-3 text-gray-400 hover:text-plum-500 hover:bg-plum-50 dark:hover:bg-plum-900/30 rounded-2xl transition-all active:scale-90">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && <TradeJournalForm onClose={() => setIsFormOpen(false)} editTrade={editingTrade} />}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-violet-900 rounded-[3rem] shadow-2xl max-w-sm w-full p-10 text-center border border-gray-100 dark:border-violet-800">
            <div className="w-20 h-20 bg-plum-100 dark:bg-plum-900/40 text-plum-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><AlertTriangle size={32} /></div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Erase Execution?</h3>
            <p className="text-gray-500 dark:text-violet-400 text-sm font-medium mb-8 leading-relaxed">This data will be purged from your historical journal permanently.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-6 py-4 bg-gray-100 dark:bg-violet-800 text-gray-700 dark:text-violet-200 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Cancel</button>
              <button onClick={() => { if(confirmDeleteId) deleteTrade(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 px-6 py-4 bg-plum-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-plum-700 shadow-xl shadow-plum-600/30 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
