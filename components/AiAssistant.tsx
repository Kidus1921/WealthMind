
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { supabase } from '../services/supabaseClient.ts';
import { generateFinancialInsights, chatWithData } from '../services/geminiService.ts';
import { Sparkles, Send, Bot, User, Lightbulb, AlertTriangle, TrendingUp, MessageSquarePlus, Trash2 } from 'lucide-react';
import { AIInsight } from '../types.ts';

export const AiAssistant: React.FC = () => {
  const { transactions, user } = useApp();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transactions.length > 0) {
      setLoadingInsights(true);
      generateFinancialInsights(transactions).then(res => {
        setInsights(res);
        setLoadingInsights(false);
      });
    }
  }, [transactions]); 

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    const userMsg = input;
    setInput('');
    setChatLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    const response = await chatWithData(userMsg, transactions);
    setChatHistory(prev => [...prev, { role: 'ai', content: response || "I couldn't process that." }]);
    setChatLoading(false);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:h-[calc(100vh-140px)]">
      <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Sparkles className="text-primary" /> Smart Insights</h2>
        <div className="space-y-4 overflow-y-auto">
          {insights.map((insight, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3">
              <div className="mt-1 shrink-0"><Lightbulb className="w-5 h-5 text-blue-500" /></div>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{insight.message}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-700 dark:text-white'}`}>{msg.content}</div>
                </div>
            ))}
        </div>
        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex gap-2 shrink-0">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your finances..." className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-700 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white" />
            <button type="submit" disabled={chatLoading} className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50"><Send className="w-5 h-5" /></button>
        </form>
      </div>
    </div>
  );
};
