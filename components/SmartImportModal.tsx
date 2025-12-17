
import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeFinancialDocument } from '../services/geminiService';
import { Transaction, TransactionType } from '../types';
import { X, Upload, FileText, Loader2, Check, AlertCircle, Trash2, Plus, RefreshCw, Wand2 } from 'lucide-react';

interface SmartImportModalProps {
  onClose: () => void;
}

interface ExtractedData extends Partial<Transaction> {
  tempId: string;
  file?: File;
  status: 'pending' | 'success' | 'error';
  confidence?: number;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose }) => {
  const { categories, paymentMethods, addTransactions } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<ExtractedData[]>([]);

  // Drag & Drop Handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFiles = async (files: File[]) => {
    setAnalyzing(true);
    const newItems: ExtractedData[] = [];

    // Create placeholders first to show immediate feedback
    const placeholders = files.map(f => ({
      tempId: Math.random().toString(36).substr(2, 9),
      file: f,
      status: 'pending' as const,
      description: 'Analyzing...',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      type: 'expense' as TransactionType,
      category: 'Other'
    }));
    
    setItems(prev => [...prev, ...placeholders]);

    // Process individually to allow partial success
    const allCategories = [...categories.income, ...categories.expense];
    
    const results = await Promise.all(placeholders.map(async (item) => {
        try {
            if (!item.file) return item;
            const data = await analyzeFinancialDocument(item.file, allCategories);
            
            if (data) {
                return {
                    ...item,
                    ...data,
                    status: 'success' as const,
                    // Ensure defaults if AI misses something
                    category: data.category || 'Other',
                    paymentMethod: data.paymentMethod || paymentMethods[0] || 'Cash',
                    type: (data.type as TransactionType) || 'expense',
                    // Re-assign file reference just in case
                    file: item.file 
                };
            } else {
                 return { ...item, status: 'error' as const, description: 'Failed to extract data' };
            }
        } catch (e) {
            return { ...item, status: 'error' as const, description: 'Analysis error' };
        }
    }));

    // Update state by replacing placeholders with results
    setItems(prev => {
        const existing = prev.filter(p => !placeholders.find(ph => ph.tempId === p.tempId));
        return [...existing, ...results];
    });
    setAnalyzing(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => 
        f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      if (validFiles.length > 0) processFiles(validFiles);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files) as File[];
      processFiles(validFiles);
    }
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleUpdateItem = (tempId: string, updates: Partial<ExtractedData>) => {
    setItems(prev => prev.map(i => i.tempId === tempId ? { ...i, ...updates } : i));
  };

  const handleImport = async () => {
    const validItems = items.filter(i => i.status !== 'error' && i.description && i.amount > 0);
    if (validItems.length === 0) return;

    const transactions: Transaction[] = validItems.map(i => ({
        id: crypto.randomUUID(),
        description: i.description || 'Unknown',
        amount: Number(i.amount),
        date: i.date || new Date().toISOString(),
        category: i.category || 'Other',
        type: i.type || 'expense',
        paymentMethod: i.paymentMethod || 'Cash',
        isRecurring: false,
        recurrenceFrequency: 'none',
        reason: 'Imported via Smart Scan',
        createdAt: Date.now()
    }));

    await addTransactions(transactions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Wand2 className="text-primary" /> Smart Receipt Import
            </h2>
            <p className="text-sm text-gray-500">Upload receipts or statements to auto-extract details.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900/30">
          
          {/* Drop Zone */}
          {items.length === 0 && !analyzing ? (
             <div 
               className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center text-center transition-all cursor-pointer
                 ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-slate-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-slate-800'}
               `}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}
               onClick={() => document.getElementById('file-upload')?.click()}
             >
                <input 
                  id="file-upload" 
                  type="file" 
                  multiple 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                   <Upload size={32} />
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Click or drop receipts here</p>
                <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG, PDF</p>
             </div>
          ) : (
            <div className="space-y-4">
               {/* Add more button */}
               <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold text-gray-700 dark:text-gray-200">Review Transactions</h3>
                 <button 
                   onClick={() => document.getElementById('add-more-upload')?.click()}
                   className="text-sm text-primary hover:underline flex items-center gap-1"
                 >
                   <Plus size={14} /> Add more files
                 </button>
                 <input 
                    id="add-more-upload" 
                    type="file" 
                    multiple 
                    accept="image/*,application/pdf"
                    className="hidden" 
                    onChange={handleFileChange}
                  />
               </div>

               {/* List of items */}
               <div className="grid grid-cols-1 gap-4">
                 {items.map((item, idx) => (
                    <div key={item.tempId} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700 flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                       {/* Thumbnail / Status */}
                       <div className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative">
                          {item.status === 'pending' ? (
                             <Loader2 className="animate-spin text-primary" />
                          ) : item.file && item.file.type.startsWith('image') ? (
                             <img src={URL.createObjectURL(item.file)} alt="Receipt" className="w-full h-full object-cover" />
                          ) : (
                             <FileText className="text-gray-400" size={32} />
                          )}
                          
                          {/* Confidence Badge */}
                          {item.status === 'success' && item.confidence !== undefined && (
                             <div className={`absolute bottom-0 inset-x-0 text-[10px] text-center py-0.5 text-white font-bold
                                ${item.confidence > 0.8 ? 'bg-emerald-500' : item.confidence > 0.5 ? 'bg-amber-500' : 'bg-rose-500'}
                             `}>
                                {(item.confidence * 100).toFixed(0)}% Match
                             </div>
                          )}
                       </div>

                       {/* Form Fields */}
                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="lg:col-span-2">
                             <label className="text-xs text-gray-500 mb-1 block">Description</label>
                             <input 
                               type="text" 
                               value={item.description}
                               onChange={e => handleUpdateItem(item.tempId, { description: e.target.value })}
                               className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm"
                               placeholder="Vendor name"
                             />
                          </div>
                          <div>
                             <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                             <input 
                               type="number" 
                               value={item.amount}
                               onChange={e => handleUpdateItem(item.tempId, { amount: parseFloat(e.target.value) })}
                               className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm font-semibold"
                             />
                          </div>
                          <div>
                             <label className="text-xs text-gray-500 mb-1 block">Date</label>
                             <input 
                               type="date" 
                               value={item.date}
                               onChange={e => handleUpdateItem(item.tempId, { date: e.target.value })}
                               className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm"
                             />
                          </div>
                          <div>
                             <label className="text-xs text-gray-500 mb-1 block">Category</label>
                             <select 
                               value={item.category}
                               onChange={e => handleUpdateItem(item.tempId, { category: e.target.value })}
                               className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm"
                             >
                                {(item.type === 'income' ? categories.income : categories.expense).map(c => (
                                   <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="Other">Other</option>
                             </select>
                          </div>
                          <div>
                             <label className="text-xs text-gray-500 mb-1 block">Type</label>
                             <select 
                               value={item.type}
                               onChange={e => handleUpdateItem(item.tempId, { type: e.target.value as TransactionType })}
                               className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm"
                             >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                             </select>
                          </div>
                          <div className="lg:col-span-2 flex items-end justify-end">
                             <button 
                               onClick={() => handleRemoveItem(item.tempId)}
                               className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                               title="Remove"
                             >
                               <Trash2 size={18} />
                             </button>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
          <div className="text-sm text-gray-500">
             {items.length > 0 && `${items.length} file(s) processed`}
          </div>
          <div className="flex gap-3">
             <button 
               onClick={onClose}
               className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
             >
               Cancel
             </button>
             {items.length > 0 && (
                <button 
                  onClick={handleImport}
                  disabled={analyzing || items.filter(i => i.status === 'success').length === 0}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-primary/25"
                >
                  {analyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                  Import {items.filter(i => i.status === 'success').length} Transaction(s)
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
