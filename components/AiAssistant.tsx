import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { generateFinancialInsights, chatWithData } from '../services/geminiService';
import { Sparkles, Send, Bot, User, Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react';
import { AIInsight } from '../types';

export const AiAssistant: React.FC = () => {
  const { transactions } = useApp();
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
  }, [transactions]); // In real app, debounce this

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setChatLoading(true);

    const response = await chatWithData(userMsg, transactions);
    
    setChatHistory(prev => [...prev, { role: 'ai', content: response || "Sorry, I couldn't process that." }]);
    setChatLoading(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Insights Panel */}
      <div className="lg:col-span-1 space-y-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Sparkles className="text-primary" /> 
          Smart Insights
        </h2>
        
        {loadingInsights ? (
          <div className="animate-pulse space-y-3">
             <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
             <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
          </div>
        ) : insights.length === 0 ? (
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-gray-500 text-center">
            Add some transactions to generate AI insights.
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex gap-3">
              <div className="mt-1">{renderInsightIcon(insight.type)}</div>
              <div>
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{insight.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Financial Assistant</h3>
          <p className="text-xs text-gray-500">Ask about your spending habits, totals, or budget advice.</p>
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

        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a question about your finances..."
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-700 border-none rounded-xl focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
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