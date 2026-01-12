
import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { analyzeFinancialDocument } from '../services/geminiService.ts';
import { Transaction, TransactionType } from '../types.ts';
import { 
  X, Upload, FileText, Loader2, Check, AlertCircle, 
  Trash2, Plus, RefreshCw, Wand2, Info, DollarSign, 
  Calendar, Tag, Layers, ChevronRight, Image as ImageIcon,
  ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

interface SmartImportModalProps {
  onClose: () => void;
}

interface ExtractedData extends Partial<Transaction> {
  tempId: string;
  file?: File;
  status: 'pending' | 'success' | 'error';
  fileName: string;
  fileSize: string;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose }) => {
  const { categories, paymentMethods, addTransactions, currency } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<ExtractedData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = async (files: File[]) => {
    const allCategories = [...categories.income, ...categories.expense];
    
    const newItems: ExtractedData[] = files.map(f => ({
      tempId: crypto.randomUUID(),
      file: f,
      fileName: f.name,
      fileSize: formatFileSize(f.size),
      status: 'pending',
      description: 'Analyzing...',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      type: 'expense' as TransactionType,
      category: 'Other'
    }));
    
    setItems(prev => [...prev, ...newItems]);

    newItems.forEach(async (item) => {
      try {
        if (!item.file) return;
        const data = await analyzeFinancialDocument(item.file, allCategories);
        
        setItems(prev => prev.map(p => p.tempId === item.tempId ? {
          ...p,
          ...data,
          status: data ? 'success' : 'error',
          description: data?.description || 'Scan failed',
          category: data?.category || 'Other',
          paymentMethod: data?.paymentMethod || paymentMethods[0] || 'Cash',
          type: (data?.type as TransactionType) || 'expense'
        } : p));
      } catch (e) {
        setItems(prev => prev.map(p => p.tempId === item.tempId ? { 
          ...p, 
          status: 'error', 
          description: 'AI logic failed' 
        } : p));
      }
    });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Fix: Cast the file list explicitly to File[] after filtering to resolve Type '{}' error
      const validFiles = Array.from(e.dataTransfer.files).filter((f: File) => 
        f.type.startsWith('image/') || f.type === 'application/pdf'
      ) as File[];
      processFiles(validFiles);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleUpdateItem = (tempId: string, updates: Partial<ExtractedData>) => {
    setItems(prev => prev.map(i => i.tempId === tempId ? { ...i, ...updates } : i));
  };

  const handleImport = async () => {
    const validItems = items.filter(i => i.status === 'success' && (i.amount || 0) > 0);
    if (validItems.length === 0) return;

    const transactions: Transaction[] = validItems.map(i => ({
      id: crypto.randomUUID(),
      description: i.description || 'Smart Import',
      amount: Number(i.amount),
      date: i.date || new Date().toISOString(),
      category: i.category || 'Other',
      type: i.type || 'expense',
      paymentMethod: i.paymentMethod || 'Cash',
      isRecurring: false,
      recurrenceFrequency: 'none',
      reason: 'AI Assisted Scan',
      referenceId: i.referenceId || undefined,
      createdAt: Date.now()
    }));

    await addTransactions(transactions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[150] p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-violet-950 rounded-[3rem] w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-violet-800">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-violet-800 flex justify-between items-center bg-gray-50/80 dark:bg-violet-900/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
              <Wand2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Smart Import Engine</h2>
              <p className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-[0.2em] mt-0.5">Automated Receipt Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-violet-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-violet-700 transition-all active:scale-95 shadow-sm">
            <X size={24} className="text-gray-500 dark:text-violet-300" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin bg-gray-50/30 dark:bg-violet-950">
          {items.length === 0 ? (
            <div 
              className={`border-4 border-dashed rounded-[3rem] h-[50vh] flex flex-col items-center justify-center text-center transition-all cursor-pointer group
                ${dragActive ? 'border-primary bg-primary/5 scale-[0.98]' : 'border-gray-200 dark:border-violet-800 hover:border-primary/50 hover:bg-white dark:hover:bg-violet-900/30'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
              <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-primary/10">
                <Upload size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Drop files here or click to browse</h3>
              <p className="text-sm text-gray-400 dark:text-violet-500 font-bold uppercase tracking-widest">JPG, PNG, PDF supported</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">
              {items.map((item) => (
                <div key={item.tempId} className="relative group bg-white dark:bg-violet-900/20 rounded-[2.5rem] p-6 border border-gray-100 dark:border-violet-800 transition-all hover:shadow-2xl hover:border-primary/30 flex gap-6">
                  {/* Status Indicator */}
                  <div className="absolute top-6 right-6 z-10">
                    {item.status === 'pending' ? <Loader2 className="animate-spin text-primary" size={24} /> : 
                     item.status === 'success' ? (
                        <div className={`rounded-full p-2 shadow-lg ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                           {item.type === 'income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                        </div>
                     ) : (
                        <div className="bg-rose-500 text-white rounded-full p-2 shadow-lg"><AlertCircle size={16}/></div>
                     )}
                  </div>

                  {/* Document Preview Placeholder */}
                  <div className={`w-32 h-44 bg-gray-50 dark:bg-violet-950 rounded-3xl flex flex-col items-center justify-center shrink-0 border border-gray-100 dark:border-violet-800 shadow-inner overflow-hidden relative transition-colors ${item.status === 'success' ? (item.type === 'income' ? 'ring-2 ring-emerald-500/20' : 'ring-2 ring-rose-500/20') : ''}`}>
                    {item.file?.type.startsWith('image/') ? (
                      <ImageIcon className="text-gray-200 dark:text-violet-800" size={40} />
                    ) : (
                      <FileText className="text-gray-200 dark:text-violet-800" size={40} />
                    )}
                    <span className="absolute bottom-3 text-[9px] font-black uppercase text-gray-400 dark:text-violet-600 tracking-widest truncate px-3 w-full text-center">
                      {item.fileSize}
                    </span>
                  </div>

                  {/* Form Area */}
                  <div className="flex-1 space-y-4 min-w-0">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inferred Label</label>
                        {item.status === 'success' && (
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                             Detected: {item.type}
                           </span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={e => handleUpdateItem(item.tempId, { description: e.target.value })} 
                        className="w-full bg-gray-50 dark:bg-violet-950 px-5 py-3 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-sm font-bold dark:text-white transition-all shadow-inner outline-none" 
                        placeholder="Scanning description..." 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Value ({currency})</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                          <input 
                            type="number" 
                            value={item.amount || ''} 
                            onChange={e => handleUpdateItem(item.tempId, { amount: parseFloat(e.target.value) })} 
                            className={`w-full bg-gray-50 dark:bg-violet-950 pl-10 pr-4 py-3 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-sm font-black dark:text-white transition-all shadow-inner outline-none ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`} 
                            placeholder="0.00" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Timeline</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                          <input 
                            type="date" 
                            value={item.date?.split('T')[0]} 
                            onChange={e => handleUpdateItem(item.tempId, { date: e.target.value })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 pl-10 pr-4 py-3 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-sm font-bold dark:text-white transition-all shadow-inner outline-none" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Classification</label>
                          <select 
                            value={item.category} 
                            onChange={e => handleUpdateItem(item.tempId, { category: e.target.value })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 px-4 py-3 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-xs font-black dark:text-white transition-all shadow-inner outline-none appearance-none uppercase tracking-widest"
                          >
                            <optgroup label="Income Flow" className="bg-white dark:bg-violet-900">
                              {categories.income.map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                            <optgroup label="Expense Flow" className="bg-white dark:bg-violet-900">
                              {categories.expense.map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                          </select>
                       </div>
                       <div className="flex items-end gap-2">
                          <button 
                            onClick={() => handleUpdateItem(item.tempId, { type: item.type === 'income' ? 'expense' : 'income' })}
                            className={`flex-1 px-4 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'}`}
                            title="Toggle Type"
                          >
                            <RefreshCw size={14} /> Toggle Type
                          </button>
                          <button 
                            onClick={() => handleRemoveItem(item.tempId)}
                            className="bg-gray-100 dark:bg-violet-900 text-gray-400 hover:text-rose-500 p-3 rounded-2xl transition-all shadow-sm active:scale-95"
                            title="Discard"
                          >
                            <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add More Scans Trigger */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/50 dark:bg-violet-900/10 rounded-[2.5rem] h-[340px] border-4 border-dashed border-gray-200 dark:border-violet-800/40 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                <div className="w-16 h-16 bg-white dark:bg-violet-900 rounded-[1.5rem] flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                  <Plus size={32} />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-primary transition-colors">Queue More Files</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-violet-800 bg-white dark:bg-violet-900/80 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-8 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex -space-x-4">
               {items.slice(0, 4).map((item, idx) => (
                 <div key={idx} className={`w-10 h-10 rounded-full bg-white dark:bg-violet-800 border-4 border-gray-50 dark:border-violet-950 flex items-center justify-center shadow-lg transition-transform hover:z-10 hover:-translate-y-1 ${item.status === 'success' ? (item.type === 'income' ? 'text-emerald-500' : 'text-rose-500') : 'text-primary'}`}>
                   {item.status === 'pending' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={18} />}
                 </div>
               ))}
               {items.length > 4 && (
                 <div className="w-10 h-10 rounded-full bg-primary text-white border-4 border-gray-50 dark:border-violet-950 flex items-center justify-center text-[11px] font-black shadow-lg">
                   +{items.length - 4}
                 </div>
               )}
             </div>
             <div className="flex flex-col">
               <p className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                 Batch Processing Status
               </p>
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                 {items.filter(i => i.status === 'success').length} of {items.length} Analysed & Verified
               </p>
             </div>
          </div>

          <div className="flex gap-4 w-full sm:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 sm:flex-none px-8 py-4 text-gray-500 dark:text-violet-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-violet-800 rounded-2xl transition-all"
            >
              Discard All
            </button>
            <button 
              onClick={handleImport} 
              disabled={items.filter(i => i.status === 'success').length === 0}
              className="flex-1 sm:flex-none px-12 py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_20px_40px_-10px_rgba(172,83,172,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              <Layers size={18} /> Persist Batch to Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
