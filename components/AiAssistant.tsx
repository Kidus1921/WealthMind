
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import { generateFinancialInsights, chatWithData } from '../services/geminiService';
import { Sparkles, Send, Bot, User, Lightbulb, AlertTriangle, TrendingUp, MessageSquarePlus, Trash2 } from 'lucide-react';
import { AIInsight } from '../types';

export const AiAssistant: React.FC = () => {
  const { transactions, user } = useApp();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Insights on mount
  useEffect(() => {
    if (transactions.length > 0) {
      setLoadingInsights(true);
      generateFinancialInsights(transactions).then(res => {
        setInsights(res);
        setLoadingInsights(false);
      });
    }
  }, [transactions]); 

  // Load Chat History from DB
  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('role, content')
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (!error && data) {
        setChatHistory(data as {role: 'user' | 'ai', content: string}[]);
      }
    };
    fetchHistory();
  }, [user]);

  // Scroll to bottom when chat updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMsg = input;
    setInput('');
    setChatLoading(true);

    // Optimistic Update & Save User Message
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'user',
      content: userMsg
    });

    const response = await chatWithData(userMsg, transactions);
    const aiResponse = response || "Sorry, I couldn't process that.";
    
    // Update State & Save AI Message
    setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'ai',
      content: aiResponse
    });
    
    setChatLoading(false);
  };

  const handleNewChat = () => {
    setChatHistory([]);
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (confirm('Are you sure you want to delete your entire chat history?')) {
      setChatHistory([]);
      const { error } = await supabase.from('chat_history').delete().eq('user_id', user.id);
      if (error) {
        console.error('Error deleting history:', error);
        alert('Failed to delete history');
      }
    }
  };

  const renderInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'tip': return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'praise': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      default: return <Sparkles className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:h-[calc(100vh-140px)]">
      {/* Insights Panel */}
      <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
        <div className="shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Sparkles className="text-primary" /> 
            Smart Insights
          </h2>
        </div>
        
        {/* Insights List: Limited height on mobile to prevent DOM dominance, flex-1 on desktop */}
        <div className="space-y-4 overflow-y-auto max-h-[250px] lg:max-h-none lg:flex-1 pr-2">
          {loadingInsights ? (
            <div className="animate-pulse space-y-3">
               <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
               <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
            </div>
          ) : insights.length === 0 ? (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-gray-500 text-center border border-gray-100 dark:border-slate-700">
              Add some transactions to generate AI insights.
            </div>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex gap-3">
                <div className="mt-1 shrink-0">{renderInsightIcon(insight.type)}</div>
                <div>
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{insight.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden h-[500px] lg:h-auto">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 shrink-0 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Financial Assistant</h3>
            <p className="text-xs text-gray-500">Ask about your spending habits, totals, or budget advice.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleNewChat}
              className="p-2 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="New Chat (Clear Screen)"
            >
              <MessageSquarePlus size={20} />
            </button>
            <button 
              onClick={handleClearHistory}
              className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              title="Delete Chat History"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 opacity-60">
                    <Bot size={48} />
                    <p>How much did I spend on food last month?</p>
                </div>
            )}
            {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-none'
                    }`}>
                        {msg.content}
                    </div>
                </div>
            ))}
            {chatLoading && (
                <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-2xl rounded-bl-none">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-2 shrink-0">
            <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a question about your finances..."
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-700 border-none rounded-xl focus:ring-2 focus:ring-primary text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button 
                type="submit" 
                disabled={chatLoading || !input.trim()}
                className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
                <Send className="w-5 h-5" />
            </button>
        </form>
      </div>
    </div>
  );
};
