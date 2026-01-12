
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { supabase } from '../services/supabaseClient.ts';
import { chatWithData, generateSessionTitle } from '../services/geminiService.ts';
import { 
  Sparkles, Send, Bot, User, Lightbulb, AlertTriangle, 
  TrendingUp, MessageSquarePlus, Trash2, Loader2, 
  ChevronRight, Calculator, PieChart, ShieldCheck, HelpCircle,
  History, Clock, MoreVertical, X, ArrowLeft, MessageCircle, Menu
} from 'lucide-react';
import { AIInsight, ChatSession, ChatMessage } from '../types.ts';

const SUGGESTED_PROMPTS = [
  { text: "How much did I spend on food this month?", icon: PieChart },
  { text: "List my active loans and their balances.", icon: ShieldCheck },
  { text: "Compare my spending to last month.", icon: TrendingUp },
  { text: "What is my highest expense category?", icon: Calculator },
  { text: "Suggest ways to save based on my trends.", icon: Lightbulb },
];

export const AiAssistant: React.FC = () => {
  const { transactions, user, currency } = useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear component state if user changes
  useEffect(() => {
    setSessions([]);
    setActiveSession(null);
    setMessages([]);
  }, [user?.id]);

  // Fetch session list
  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      setLoadingSessions(true);
      setErrorState(null);
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', user.id) // Explicitly filter by user
          .order('last_message_at', { ascending: false });
        
        if (error) {
          if (error.code === '42P01') {
            setErrorState("Chat infrastructure not initialized in database.");
          } else {
            setErrorState(`Connection error: ${error.message}`);
          }
          throw error;
        }

        if (data) {
          setSessions(data.map((s: any) => ({
            id: s.id,
            title: s.title,
            createdAt: s.created_at,
            lastMessageAt: s.last_message_at
          })));
        }
      } catch (err: any) {
        console.error("Session fetch error:", err);
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, [user]);

  // Fetch messages for active session
  useEffect(() => {
    if (!activeSession || !user) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('session_id', activeSession.id)
          .eq('user_id', user.id) // Security: check message belongs to user
          .order('created_at', { ascending: true });
        
        if (error) throw error;

        if (data) {
          setMessages(data.map(m => ({
            ...m,
            id: m.id,
            sessionId: m.session_id,
            createdAt: m.created_at,
            insights: m.insights || []
          })));
        }
      } catch (err: any) {
        console.error("Message load error:", err.message);
      }
    };
    fetchMessages();
  }, [activeSession, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const startNewSession = async (initialText?: string) => {
    if (!user) return;
    setErrorState(null);
    
    try {
      const title = initialText ? await generateSessionTitle(initialText) : 'New Conversation';
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      
      if (error) throw error;

      if (data) {
        const newSession: ChatSession = {
          id: data.id,
          title: data.title,
          createdAt: data.created_at,
          lastMessageAt: data.last_message_at
        };
        setSessions([newSession, ...sessions]);
        setActiveSession(newSession);
        if (initialText) {
          handleSend(undefined, initialText, newSession.id);
        }
      }
    } catch (err: any) {
      setErrorState(`Failed to start chat: ${err.message}`);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm('Delete this conversation history?')) return;
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) setActiveSession(null);
    } catch (err: any) {
      console.error("Session delete error:", err);
    }
  };

  const handleSend = async (e?: React.FormEvent, overrideText?: string, targetSessionId?: string) => {
    e?.preventDefault();
    const text = overrideText || input;
    const sId = targetSessionId || activeSession?.id;
    if (!text.trim() || !user || !sId) return;

    setInput('');
    setLoading(true);
    setErrorState(null);

    try {
      // 1. Save User Message
      const { data: userMsgData, error: userMsgError } = await supabase.from('chat_history').insert({
        session_id: sId,
        user_id: user.id,
        role: 'user',
        content: text
      }).select().single();

      if (userMsgError) throw userMsgError;

      if (userMsgData) {
        setMessages(prev => [...prev, {
          id: userMsgData.id,
          sessionId: sId,
          role: 'user',
          content: text,
          createdAt: userMsgData.created_at
        }]);
      }

      // 2. Update session activity
      const now = new Date().toISOString();
      await supabase.from('chat_sessions').update({ last_message_at: now }).eq('id', sId).eq('user_id', user.id);
      
      setSessions(prev => 
        prev.map(s => s.id === sId ? { ...s, lastMessageAt: now } : s)
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );

      // 3. Get AI Response
      const histForAi = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const aiResult = await chatWithData(text, transactions, histForAi, currency);
      
      if (aiResult) {
        const { data: aiMsgData, error: aiMsgError } = await supabase.from('chat_history').insert({
          session_id: sId,
          user_id: user.id,
          role: 'ai',
          content: aiResult.answer,
          insights: aiResult.insights
        }).select().single();

        if (aiMsgError) throw aiMsgError;

        if (aiMsgData) {
          setMessages(prev => [...prev, {
            id: aiMsgData.id,
            sessionId: sId,
            role: 'ai',
            content: aiResult.answer,
            insights: aiResult.insights,
            createdAt: aiMsgData.created_at
          }]);
        }
      }
    } catch (err: any) {
      console.error("Chat action failed:", err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sessionId: sId,
        role: 'ai',
        content: `Error: ${err.message || "Failed to process message."}`,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'tip': return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'praise': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      default: return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
      {isSidebarOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`flex flex-col border-r border-gray-100 dark:border-slate-700 transition-all duration-300 z-30 absolute md:relative h-full bg-white dark:bg-slate-800 ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:w-0'} overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/20 flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <History size={16} /> Recent Chats
          </h2>
          <div className="flex gap-1">
            <button onClick={() => startNewSession()} className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors" title="New Chat">
              <MessageSquarePlus size={20} />
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 md:hidden"><X size={20} /></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {loadingSessions ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <MessageCircle className="mx-auto opacity-20" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest">Isolated Space</p>
            </div>
          ) : (
            sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => { setActiveSession(session); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`group p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between border ${
                  activeSession?.id === session.id ? 'bg-primary/5 border-primary/20 text-primary' : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-gray-300'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-sm font-bold truncate">{session.title}</span>
                  <span className="text-[10px] opacity-50 font-black uppercase tracking-tighter">{new Date(session.lastMessageAt).toLocaleDateString()}</span>
                </div>
                <button onClick={(e) => deleteSession(session.id, e)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-rose-500 rounded-lg transition-all"><Trash2 size={14} /></button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400"><Menu size={20} /></button>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Bot size={22} /></div>
            <div className="min-w-0">
               <h3 className="font-black text-gray-900 dark:text-white truncate">{activeSession?.title || 'Financial Assistant'}</h3>
               <p className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1">
                 <ShieldCheck size={10} /> Secure Personal Session
               </p>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-thin">
          {errorState && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 flex flex-col gap-2">
              <div className="flex items-center gap-2"><AlertTriangle size={16} /> <span>Security Notice</span></div>
              <p className="font-medium opacity-80">{errorState}</p>
            </div>
          )}
          
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-lg mx-auto py-12">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto animate-bounce-slow"><Sparkles size={40} /></div>
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white">Secure AI Workspace</h4>
                  <p className="text-sm text-gray-500">I only see <strong>your</strong> financial data. Your insights are private and isolated from all other users.</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                 {SUGGESTED_PROMPTS.map((prompt, i) => (
                   <button key={i} onClick={() => startNewSession(prompt.text)} className="p-4 text-left rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-all group flex items-start gap-3 bg-white dark:bg-slate-800 shadow-sm">
                     <prompt.icon className="w-5 h-5 text-gray-400 group-hover:text-primary shrink-0 mt-0.5" />
                     <span className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-tight">{prompt.text}</span>
                   </button>
                 ))}
               </div>
            </div>
          ) : (
            <div className="space-y-10">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                   <div className={`group relative max-w-[85%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-white rounded-bl-none border border-gray-100 dark:border-slate-800'}`}>
                      {msg.content}
                   </div>
                   {msg.role === 'ai' && msg.insights && msg.insights.length > 0 && (
                     <div className="mt-4 w-full max-w-[90%] grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1">Recommended Insights</p>
                       {msg.insights.map((ins, i) => (
                         <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-all">
                            <div className="shrink-0">{renderInsightIcon(ins.type)}</div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-tight">{ins.message}</p>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center border border-gray-100 dark:border-slate-800 shadow-sm">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={(e) => activeSession ? handleSend(e) : startNewSession()} className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-3 shrink-0">
          <div className="relative flex-1">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={activeSession ? "Ask about your finances..." : "Start private chat..."} className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-[2rem] focus:ring-4 focus:ring-primary/10 dark:text-white placeholder:text-gray-400 text-sm outline-none transition-all shadow-inner" />
            <button type="submit" disabled={loading || (!input.trim() && !!activeSession)} className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-primary text-white rounded-full disabled:opacity-50 flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-90">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
