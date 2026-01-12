
import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { analyzeFinancialDocument } from '../services/geminiService.ts';
import { Transaction, TransactionType } from '../types.ts';
import { 
  X, Upload, FileText, Loader2, Check, AlertCircle, 
  Trash2, Plus, RefreshCw, Wand2, Info, DollarSign, 
  Calendar, Tag, Layers, ChevronRight, Image as ImageIcon,
  ArrowUpRight, ArrowDownLeft, ScanLine, Eye, Sparkle
} from 'lucide-react';

interface SmartImportModalProps {
  onClose: () => void;
}

interface ExtractedData extends Partial<Transaction> {
  tempId: string;
  file?: File;
  previewUrl?: string;
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
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      fileName: f.name,
      fileSize: formatFileSize(f.size),
      status: 'pending',
      description: 'Analyzing OCR data...',
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
    setItems(prev => {
      const item = prev.find(i => i.tempId === tempId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.tempId !== tempId);
    });
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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[150] p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-violet-950 rounded-[3rem] w-full max-w-7xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-violet-800">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-violet-800 flex justify-between items-center bg-gray-50/80 dark:bg-violet-900/40">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-[1.5rem] flex items-center justify-center text-primary shadow-inner border border-primary/10">
              <ScanLine size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                Multimodal AI Scanner <Sparkle size={18} className="text-lemon-500 fill-lemon-500" />
              </h2>
              <p className="text-xs font-black text-gray-400 dark:text-violet-500 uppercase tracking-[0.2em] mt-0.5">Extracting data from Receipts & Invoices</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-violet-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-violet-700 transition-all active:scale-95 shadow-sm group">
            <X size={24} className="text-gray-500 dark:text-violet-300 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin bg-gray-50/30 dark:bg-violet-950">
          {items.length === 0 ? (
            <div 
              className={`border-4 border-dashed rounded-[4rem] h-[55vh] flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative overflow-hidden
                ${dragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-gray-200 dark:border-violet-800/50 hover:border-primary/50 hover:bg-white dark:hover:bg-violet-900/30'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
              
              <div className="relative z-10">
                <div className="w-28 h-28 bg-primary/10 rounded-[3rem] flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-700 shadow-2xl shadow-primary/20 ring-4 ring-primary/5">
                  <Upload size={48} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Drop receipts or click to upload</h3>
                <p className="text-sm text-gray-400 dark:text-violet-500 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                  Our AI scans images and PDFs to automatically extract totals, dates, and categories.
                </p>
              </div>

              {/* Decorative background elements */}
              <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-10 w-48 h-48 bg-plum-500/5 rounded-full blur-3xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-bottom-6 duration-700 pb-10">
              {items.map((item) => (
                <div key={item.tempId} className="relative group bg-white dark:bg-violet-900/30 rounded-[3rem] p-6 border border-gray-100 dark:border-violet-800 transition-all hover:shadow-2xl hover:border-primary/40 flex flex-col sm:flex-row gap-8">
                  
                  {/* Document Preview */}
                  <div className={`w-full sm:w-44 h-60 sm:h-64 bg-gray-50 dark:bg-violet-950 rounded-[2.5rem] flex flex-col items-center justify-center shrink-0 border border-gray-100 dark:border-violet-800/50 shadow-inner overflow-hidden relative group/preview ${item.status === 'success' ? 'ring-2 ring-primary/20' : ''}`}>
                    {item.previewUrl ? (
                      <div className="w-full h-full relative">
                        <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover/preview:scale-110 duration-700" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={24} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <FileText className="text-gray-200 dark:text-violet-800 mb-2" size={48} />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PDF DOC</span>
                      </div>
                    )}
                    
                    {item.status === 'pending' && (
                        <div className="absolute inset-0 bg-violet-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                            <div className="relative">
                                <Loader2 className="animate-spin text-white mb-2" size={32} />
                                <div className="absolute top-0 left-0 w-full h-1 bg-white/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary animate-pulse w-full" />
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse mt-2">Scanning...</span>
                        </div>
                    )}

                    <div className="absolute bottom-3 left-0 right-0 px-4">
                        <div className="bg-white/80 dark:bg-violet-900/80 backdrop-blur-md rounded-xl py-1 px-2 flex justify-between items-center shadow-sm">
                            <span className="text-[8px] font-black uppercase text-gray-500 truncate max-w-[60%]">{item.fileName}</span>
                            <span className="text-[8px] font-black uppercase text-primary shrink-0">{item.fileSize}</span>
                        </div>
                    </div>
                  </div>

                  {/* Form Area */}
                  <div className="flex-1 space-y-5 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 min-w-0 pr-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                <Info size={12} className="text-primary" /> Extracted Description
                            </label>
                            <input 
                                type="text" 
                                value={item.description} 
                                onChange={e => handleUpdateItem(item.tempId, { description: e.target.value })} 
                                className="w-full bg-gray-50 dark:bg-violet-950 px-5 py-4 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-sm font-bold dark:text-white transition-all shadow-inner outline-none" 
                                placeholder="Detecting merchant..." 
                            />
                        </div>
                        <div className="shrink-0 pt-6">
                            {item.status === 'success' ? (
                                <div className={`rounded-2xl p-3 shadow-xl ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'} text-white animate-in zoom-in-50 duration-500`}>
                                    {item.type === 'income' ? <ArrowDownLeft size={20}/> : <ArrowUpRight size={20}/>}
                                </div>
                            ) : item.status === 'error' ? (
                                <div className="bg-rose-500 text-white rounded-2xl p-3 shadow-xl"><AlertCircle size={20}/></div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                            <DollarSign size={12} className="text-primary" /> Amount ({currency})
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={item.amount || ''} 
                            onChange={e => handleUpdateItem(item.tempId, { amount: parseFloat(e.target.value) })} 
                            className={`w-full bg-gray-50 dark:bg-violet-950 px-5 py-4 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-base font-black dark:text-white transition-all shadow-inner outline-none ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`} 
                            placeholder="0.00" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                            <Calendar size={12} className="text-primary" /> Scan Date
                        </label>
                        <input 
                            type="date" 
                            value={item.date?.split('T')[0]} 
                            onChange={e => handleUpdateItem(item.tempId, { date: e.target.value })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 px-5 py-4 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-sm font-bold dark:text-white transition-all shadow-inner outline-none" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                              <Tag size={12} className="text-primary" /> Category
                          </label>
                          <select 
                            value={item.category} 
                            onChange={e => handleUpdateItem(item.tempId, { category: e.target.value })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 px-5 py-4 rounded-2xl border-none focus:ring-4 focus:ring-primary/20 text-[11px] font-black dark:text-white transition-all shadow-inner outline-none appearance-none uppercase tracking-widest"
                          >
                            <optgroup label="Income Sources" className="bg-white dark:bg-violet-900">
                              {categories.income.map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                            <optgroup label="Expenditure" className="bg-white dark:bg-violet-900">
                              {categories.expense.map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                          </select>
                       </div>
                       <div className="flex items-end gap-3">
                          <button 
                            onClick={() => handleUpdateItem(item.tempId, { type: item.type === 'income' ? 'expense' : 'income' })}
                            className={`flex-1 px-4 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 border ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100'}`}
                            title="Flip Flow"
                          >
                            <RefreshCw size={14} /> Type
                          </button>
                          <button 
                            onClick={() => handleRemoveItem(item.tempId)}
                            className="bg-gray-100 dark:bg-violet-900 text-gray-400 hover:text-rose-500 p-4 rounded-2xl transition-all shadow-sm active:scale-95 group/del"
                            title="Remove from batch"
                          >
                            <Trash2 size={18} className="group-hover/del:scale-110" />
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add More Scans Trigger */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/40 dark:bg-violet-900/10 rounded-[3rem] h-auto min-h-[340px] border-4 border-dashed border-gray-200 dark:border-violet-800/40 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                <div className="w-20 h-20 bg-white dark:bg-violet-900 rounded-[2rem] flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform ring-4 ring-primary/5">
                  <Plus size={36} />
                </div>
                <div className="text-center">
                    <span className="block text-sm font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-primary transition-colors">Queue More Receipts</span>
                    <span className="text-[10px] font-bold text-gray-300 dark:text-violet-800 uppercase mt-1">Multi-file batching active</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-violet-800 bg-white dark:bg-violet-900/80 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-8 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex -space-x-4">
               {items.slice(0, 5).map((item, idx) => (
                 <div key={idx} className={`w-12 h-12 rounded-full bg-white dark:bg-violet-800 border-4 border-gray-50 dark:border-violet-950 flex items-center justify-center shadow-2xl transition-transform hover:z-10 hover:-translate-y-2 ${item.status === 'success' ? (item.type === 'income' ? 'text-emerald-500' : 'text-rose-500') : 'text-primary'}`}>
                   {item.status === 'pending' ? <Loader2 size={20} className="animate-spin" /> : item.previewUrl ? <ImageIcon size={20} /> : <FileText size={20} />}
                 </div>
               ))}
               {items.length > 5 && (
                 <div className="w-12 h-12 rounded-full bg-primary text-white border-4 border-gray-50 dark:border-violet-950 flex items-center justify-center text-[12px] font-black shadow-2xl">
                   +{items.length - 5}
                 </div>
               )}
             </div>
             <div className="flex flex-col">
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Batch Scan Intelligence
               </p>
               <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                 {items.filter(i => i.status === 'success').length} verified • {items.filter(i => i.status === 'pending').length} processing • {items.filter(i => i.status === 'error').length} issues
               </p>
             </div>
          </div>

          <div className="flex gap-4 w-full sm:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 sm:flex-none px-8 py-5 text-gray-400 dark:text-violet-500 font-black uppercase tracking-widest text-[10px] hover:text-rose-500 transition-colors rounded-3xl"
            >
              Cancel Batch
            </button>
            <button 
              onClick={handleImport} 
              disabled={items.filter(i => i.status === 'success').length === 0}
              className="flex-1 sm:flex-none px-12 py-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-[0_25px_50px_-10px_rgba(172,83,172,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4"
            >
              <Layers size={20} /> Commit {items.filter(i => i.status === 'success').length} to Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
