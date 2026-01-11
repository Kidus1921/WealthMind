
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, Loader2, AlertCircle, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const Auth: React.FC = () => {
  const { theme, toggleTheme } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        else alert('Registration successful! You can now log in.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-violet-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-8 right-8">
         <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-violet-900 text-gray-500 dark:text-violet-400 hover:text-primary rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-violet-800"
         >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </div>

      <div className="bg-white dark:bg-violet-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-violet-800 animate-in fade-in zoom-in-95 duration-500">
        <div className="p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black bg-gradient-to-r from-violet-500 to-plum-500 bg-clip-text text-transparent tracking-tight">
              WealthMind
            </h1>
            <p className="text-gray-500 dark:text-violet-300 mt-3 font-medium">
              {isLogin ? 'Welcome back! Please sign in.' : 'Create an account to start tracking.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-plum-50 dark:bg-plum-950/30 border border-plum-100 dark:border-plum-900 rounded-2xl flex items-center gap-3 text-plum-600 dark:text-plum-400 text-sm font-bold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest mb-2 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-violet-600 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-gray-50 dark:bg-violet-950 text-gray-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400 font-bold shadow-inner outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-violet-600 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-gray-50 dark:bg-violet-950 text-gray-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400 font-bold shadow-inner outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center shadow-xl shadow-violet-500/25 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-gray-500 dark:text-violet-400 font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-black hover:underline ml-1"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
