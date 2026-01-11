
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Trade, TradingSession, KillZone } from '../types.ts';
import { X, Calendar, Clock, Sparkles, TrendingUp, TrendingDown, Info, Save, MousePointer2 } from 'lucide-react';

interface TradeJournalFormProps {
  onClose: () => void;
  editTrade?: Trade;
}

const SESSION_WINDOWS = {
  Asia: { start: 180, end: 720 }, // 03:00 - 12:00
  London: { start: 600, end: 1140 }, // 10:00 - 19:00
  'New York': { start: 900, end: 1440 }, // 15:00 - 00:00
};

const KILLZONE_WINDOWS = {
  'Asia Open': { start: 180, end: 300 }, // 03:00 - 05:00
  'London Open': { start: 540, end: 720 }, // 09:00 - 12:00
  'NY Open': { start: 900, end: 1080 }, // 15:00 - 18:00
  'London Close': { start: 1080, end: 1200 }, // 18:00 - 20:00
};

export const TradeJournalForm: React.FC<TradeJournalFormProps> = ({ onClose, editTrade }) => {
  const { addTrade, updateTrade, user } = useApp();
  const [formData, setFormData] = useState<Partial<Trade>>(
    editTrade || {
      tradeDate: new Date().toISOString().split('T')[0],
      tradeTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      symbol: '',
      type: 'Buy',
      pnl: 0,
      notes: '',
      session: 'None',
      killZone: 'None',
    }
  );

  const [manualSession, setManualSession] = useState<TradingSession | null>(editTrade ? editTrade.session : null);
  const [manualKillZone, setManualKillZone] = useState<KillZone | null>(editTrade ? editTrade.killZone : null);

  const timeInMinutes = useMemo(() => {
    if (!formData.tradeTime) return 0;
    const [h, m] = formData.tradeTime.split(':').map(Number);
    return h * 60 + m;
  }, [formData.tradeTime]);

  const detection = useMemo(() => {
    const t = timeInMinutes;
    const sessions: TradingSession[] = [];
    if (t >= SESSION_WINDOWS.Asia.start && t <= SESSION_WINDOWS.Asia.end) sessions.push('Asia');
    if (t >= SESSION_WINDOWS.London.start && t <= SESSION_WINDOWS.London.end) sessions.push('London');
    if (t >= SESSION_WINDOWS['New York'].start && t <= SESSION_WINDOWS['New York'].end) sessions.push('New York');

    const killZones: KillZone[] = [];
    if (t >= KILLZONE_WINDOWS['Asia Open'].start && t <= KILLZONE_WINDOWS['Asia Open'].end) killZones.push('Asia Open');
    if (t >= KILLZONE_WINDOWS['London Open'].start && t <= KILLZONE_WINDOWS['London Open'].end) killZones.push('London Open');
    if (t >= KILLZONE_WINDOWS['NY Open'].start && t <= KILLZONE_WINDOWS['NY Open'].end) killZones.push('NY Open');
    if (t >= KILLZONE_WINDOWS['London Close'].start && t <= KILLZONE_WINDOWS['London Close'].end) killZones.push('London Close');

    // Overlap handling logic: select oldest session by default
    let autoSession: TradingSession = sessions[0] || 'None';
    if (sessions.includes('Asia') && sessions.includes('London')) autoSession = 'Asia';
    else if (sessions.includes('London') && sessions.includes('New York')) autoSession = 'London';

    return {
      availableSessions: sessions,
      availableKillZones: killZones,
      autoSession,
      autoKillZone: (killZones[0] || 'None') as KillZone,
      isOverlap: sessions.length > 1
    };
  }, [timeInMinutes]);

  // Sync auto-detected values unless manually overridden
  useEffect(() => {
    if (!manualSession) {
      setFormData(prev => ({ ...prev, session: detection.autoSession }));
    } else if (!detection.availableSessions.includes(manualSession)) {
      // If manual session is no longer valid for the time, reset to auto
      setManualSession(null);
      setFormData(prev => ({ ...prev, session: detection.autoSession }));
    }

    if (!manualKillZone) {
      setFormData(prev => ({ ...prev, killZone: detection.autoKillZone }));
    } else if ((manualKillZone as string) !== 'None' && !detection.availableKillZones.includes(manualKillZone as any)) {
      // Fixed potential comparison issue with string cast
      setManualKillZone(null);
      setFormData(prev => ({ ...prev, killZone: detection.autoKillZone }));
    }
  }, [detection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trade: Trade = {
      id: editTrade?.id || crypto.randomUUID(),
      userId: user.id,
      tradeDate: formData.tradeDate!,
      tradeTime: formData.tradeTime!,
      session: formData.session!,
      killZone: formData.killZone!,
      symbol: formData.symbol?.toUpperCase() || 'UNKNOWN',
      type: formData.type || 'Buy',
      pnl: Number(formData.pnl) || 0,
      notes: formData.notes,
      createdAt: editTrade?.createdAt || Date.now(),
    };

    if (editTrade) await updateTrade(trade);
    else await addTrade(trade);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-violet-950/80 backdrop-blur-xl z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-violet-900 rounded-[3rem] w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-violet-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 dark:border-violet-800 flex justify-between items-center bg-gray-50/50 dark:bg-violet-950/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-violet-50 tracking-tight flex items-center gap-3">
              <TrendingUp className="text-primary" />
              Trade Entry Ledger
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">EAT Timezone Context Applied (UTC+3)</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-violet-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-violet-700 transition-all active:scale-90"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-1 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Trade Date</label>
              <input 
                type="date" 
                required 
                value={formData.tradeDate} 
                onChange={e => setFormData({...formData, tradeDate: e.target.value})} 
                className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Trade Time (EAT)</label>
              <input 
                type="time" 
                required 
                value={formData.tradeTime} 
                onChange={e => setFormData({...formData, tradeTime: e.target.value})} 
                className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Symbol</label>
              <input 
                type="text" 
                required 
                placeholder="XAUUSD, EURUSD" 
                value={formData.symbol} 
                onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})} 
                className="w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white font-bold transition-all shadow-inner outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Type</label>
              <div className="flex p-1 bg-gray-100 dark:bg-violet-950 rounded-[1.2rem] gap-1 shadow-inner">
                <button type="button" onClick={() => setFormData({...formData, type: 'Buy'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'Buy' ? 'bg-evergreen-500 text-white shadow-lg' : 'text-gray-400'}`}>Buy</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'Sell'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'Sell' ? 'bg-plum-500 text-white shadow-lg' : 'text-gray-400'}`}>Sell</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">P&L Result</label>
              <input 
                type="number" 
                step="0.01" 
                value={formData.pnl} 
                onChange={e => setFormData({...formData, pnl: parseFloat(e.target.value)})} 
                className={`w-full px-6 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 font-bold transition-all shadow-inner outline-none ${formData.pnl! >= 0 ? 'text-evergreen-600 dark:text-evergreen-400' : 'text-plum-600 dark:text-plum-400'}`} 
              />
            </div>
          </div>

          <div className="p-6 bg-violet-50 dark:bg-violet-950/40 rounded-[2rem] border border-violet-100 dark:border-violet-800 space-y-6">
            <div className="flex justify-between items-center">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 flex items-center gap-2">
                 <Sparkles size={16} /> Intelligent Detection
               </h4>
               {detection.isOverlap && (
                 <span className="px-3 py-1 bg-lemon-100 dark:bg-lemon-900/30 text-lemon-700 dark:text-lemon-400 rounded-full text-[9px] font-black uppercase animate-pulse">Overlap Window</span>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black text-gray-500 dark:text-violet-400 uppercase tracking-widest">Trading Session</label>
                   <div className="group relative">
                      <Info size={12} className="text-violet-300" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-violet-900 text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-violet-700">
                        Session selected based on trade time (EAT). Defaults to oldest session in overlaps.
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {(['Asia', 'London', 'New York', 'None'] as TradingSession[]).map(s => {
                     const isAvailable = detection.availableSessions.includes(s) || s === 'None';
                     const isSelected = formData.session === s;
                     return (
                       <button
                         key={s}
                         type="button"
                         disabled={!isAvailable}
                         onClick={() => { setManualSession(s); setFormData({...formData, session: s}); }}
                         className={`py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${
                           isSelected ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]' : 
                           isAvailable ? 'bg-white dark:bg-violet-900 text-violet-400 border-violet-100 dark:border-violet-800 hover:border-primary' : 
                           'bg-gray-100 dark:bg-violet-950 text-gray-300 dark:text-violet-900 border-transparent cursor-not-allowed grayscale'
                         }`}
                       >
                         {s}
                       </button>
                     );
                   })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 dark:text-violet-400 uppercase tracking-widest">Active Kill Zone</label>
                <div className="grid grid-cols-2 gap-2">
                   {(['Asia Open', 'London Open', 'NY Open', 'London Close', 'None'] as KillZone[]).map(kz => {
                     // Fixed 'no overlap' comparison error by casting kz to string for checking equality with 'None'
                     const isAvailable = (kz as string) === 'None' || detection.availableKillZones.includes(kz as any);
                     const isSelected = formData.killZone === (kz as any);
                     return (
                       <button
                         key={kz}
                         type="button"
                         disabled={!isAvailable && (kz as string) !== 'None'}
                         onClick={() => { setManualKillZone(kz); setFormData({...formData, killZone: kz}); }}
                         className={`py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${
                           isSelected ? 'bg-evergreen-500 text-white border-evergreen-500 shadow-lg scale-[1.02]' : 
                           isAvailable ? 'bg-white dark:bg-violet-900 text-evergreen-600 dark:text-evergreen-400 border-violet-100 dark:border-violet-800 hover:border-evergreen-500' : 
                           'bg-gray-100 dark:bg-violet-950 text-gray-300 dark:text-violet-900 border-transparent cursor-not-allowed grayscale'
                         }`}
                       >
                         {kz}
                       </button>
                     );
                   })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest">Journal Notes & Bias</label>
            <textarea 
              placeholder="Why did you take this trade? Confluences, emotions, exit logic..." 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              className="w-full px-6 py-5 rounded-[2rem] bg-gray-50 dark:bg-violet-950 border-none focus:ring-4 focus:ring-primary/10 dark:text-white min-h-[140px] font-medium transition-all shadow-inner outline-none" 
            />
          </div>
        </form>

        <div className="p-8 border-t border-gray-100 dark:border-violet-800 bg-gray-50/50 dark:bg-violet-950/50 shrink-0 flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 text-gray-500 dark:text-violet-400 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">Discard</button>
          <button onClick={handleSubmit} className="flex-[2] py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-violet-600 shadow-2xl shadow-violet-500/40 active:scale-95 transition-all flex items-center justify-center gap-3">
            <Save size={18} /> Persist Trade
          </button>
        </div>
      </div>
    </div>
  );
};
