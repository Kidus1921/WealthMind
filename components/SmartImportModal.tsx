
import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { analyzeFinancialDocument } from '../services/geminiService.ts';
import { Transaction, TransactionType } from '../types.ts';
import { X, Upload, FileText, Loader2, Check, AlertCircle, Trash2, Plus, RefreshCw, Wand2, Info } from 'lucide-react';

interface SmartImportModalProps {
  onClose: () => void;
}

interface ExtractedData extends Partial<Transaction> {
  tempId: string;
  file?: File;
  status: 'pending' | 'success' | 'error';
  confidence?: number;
  amountConfidence?: number;
  dateConfidence?: number;
  descriptionConfidence?: number;
  categoryConfidence?: number;
  referenceIdConfidence?: number;
}

const CONFIDENCE_THRESHOLD = 0.8;

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose }) => {
  const { categories, paymentMethods, addTransactions } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<ExtractedData[]>([]);

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
                    category: data.category || 'Other',
                    paymentMethod: data.paymentMethod || paymentMethods[0] || 'Cash',
                    type: (data.type as TransactionType) || 'expense',
                    file: item.file 
                };
            } else {
                 return { ...item, status: 'error' as const, description: 'Failed extraction' };
            }
        } catch (e) {
            return { ...item, status: 'error' as const, description: 'Analysis error' };
        }
    }));

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
        referenceId: i.referenceId || undefined,
        createdAt: Date.now()
    }));

    await addTransactions(transactions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Wand2 className="text-primary" /> Smart Receipt Import
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900/30">
          {items.length === 0 && !analyzing ? (
             <div 
               className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center text-center transition-all cursor-pointer
                 ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-slate-600 hover:border-primary'}
               `}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}
               onClick={() => document.getElementById('file-upload')?.click()}
             >
                <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                <Upload size={32} className="text-primary mb-4" />
                <p className="font-medium text-gray-700 dark:text-gray-200">Drop files or click to upload</p>
             </div>
          ) : (
            <div className="space-y-4">
                 {items.map((item, idx) => (
                    <div key={item.tempId} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 flex gap-4">
                       <div className="w-24 h-32 shrink-0 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative border">
                          {item.status === 'pending' ? <Loader2 className="animate-spin text-primary" /> : <FileText className="text-gray-400" size={32} />}
                       </div>
                       <div className="flex-1 grid grid-cols-2 gap-4">
                          <input type="text" value={item.description} onChange={v => handleUpdateItem(item.tempId, { description: v.target.value })} className="w-full px-3 py-1.5 rounded-lg border text-sm" placeholder="Description" />
                          <input type="number" value={item.amount} onChange={v => handleUpdateItem(item.tempId, { amount: parseFloat(v.target.value) })} className="w-full px-3 py-1.5 rounded-lg border text-sm" placeholder="Amount" />
                          <button onClick={() => handleRemoveItem(item.tempId)} className="text-rose-500 p-2"><Trash2 size={16} /></button>
                       </div>
                    </div>
                 ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
             <button onClick={handleImport} className="px-6 py-2 bg-primary text-white rounded-lg font-medium shadow-lg">Import</button>
        </div>
      </div>
    </div>
  );
};
