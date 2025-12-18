
import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { analyzeFinancialDocument } from '../services/geminiService.ts';
import { Transaction, TransactionType } from '../types.ts';
import { X, Upload, FileText, Loader2, Check, AlertCircle, Trash2, Plus, RefreshCw, Wand2, Info } from 'lucide-react';

interface SmartImportModalProps {
  onClose: () => void;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose }) => {
  const { categories, paymentMethods, addTransactions } = useApp();
  const [items, setItems] = useState<any[]>([]);

  const handleImport = async () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Wand2 size={20}/> Smart Scan</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20} /></button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
           <Upload size={48} className="text-gray-300 mb-4" />
           <p className="text-gray-500">Feature coming soon or please drop files here.</p>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-gray-500">Cancel</button>
           <button onClick={handleImport} className="px-6 py-2 bg-primary text-white rounded-lg">Done</button>
        </div>
      </div>
    </div>
  );
};
