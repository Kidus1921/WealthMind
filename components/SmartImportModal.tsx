
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      description: 'AI Analyzing...',
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
          description: 'AI Logic Failed' 
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

    const txns: Transaction[] = validItems.map(i => ({
      id: crypto.randomUUID(),
      description: i.description || 'AI Import',
      amount: Number(i.amount),
      date: i.date || new Date().toISOString(),
      category: i.category || 'Other',
      type: i.type || 'expense',
      paymentMethod: i.paymentMethod || 'Cash',
      isRecurring: false,
      recurrenceFrequency: 'none',
      createdAt: Date.now()
    }));

    await addTransactions(txns);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[200] p-3 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-violet-950 rounded-[2rem] md:rounded-[3rem] w-full max-w-7xl h-[95vh] md:h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-violet-800">
        
        {/* Header */}
        <div className="p-5 md:p-8 border-b border-gray-100 dark:border-violet-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center text-primary border border-primary/10">
              <ScanLine size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">AI Scanner</h2>
              <p className="hidden xs:block text-[9px] font-black text-gray-400 dark:text-violet-500 uppercase tracking-widest mt-0.5">Automated Receipt Extraction</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 md:p-3 bg-gray-100 dark:bg-violet-800 rounded-xl md:rounded-2xl hover:bg-gray-200 transition-all"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scrollbar-thin">
          {items.length === 0 ? (
            <div 
              className={`border-4 border-dashed rounded-[2.5rem] md:rounded-[4rem] h-[60vh] flex flex-col items-center justify-center text-center p-6 transition-all cursor-pointer relative overflow-hidden
                ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-violet-800/50 hover:bg-gray-50 dark:hover:bg-violet-900/20'}
              `}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
              <div className="w-20 h-20 md:w-28 md:h-28 bg-primary/10 rounded-[2rem] md:rounded-[3rem] flex items-center justify-center text-primary mb-6 shadow-2xl shadow-primary/10">
                <Upload size={32} className="md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2">Drop receipt images</h3>
              <p className="text-[10px] md:text-sm text-gray-400 font-bold uppercase tracking-widest max-w-sm">We'll automatically extract merchant names, dates, and amounts from your photos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 pb-10">
              {items.map((item) => (
                <div key={item.tempId} className="bg-white dark:bg-violet-900/30 rounded-[2rem] md:rounded-[3rem] p-4 md:p-6 border border-gray-100 dark:border-violet-800 flex flex-col sm:flex-row gap-4 md:gap-8 group">
                  
                  {/* Preview Section */}
                  <div className={`w-full sm:w-32 md:w-44 h-48 sm:h-auto bg-gray-50 dark:bg-violet-950 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shrink-0 border border-gray-100 dark:border-violet-800/50 overflow-hidden relative ${item.status === 'success' ? 'ring-2 ring-primary/20' : ''}`}>
                    {item.previewUrl ? (
                      <img src={item.previewUrl} alt="Receipt" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="text-gray-200 dark:text-violet-800" size={32} />
                    )}
                    
                    {item.status === 'pending' && (
                        <div className="absolute inset-0 bg-violet-900/50 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-white mb-2" size={24} />
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">Scanning</span>
                        </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-white/80 dark:bg-violet-900/80 p-1.5 rounded-lg backdrop-blur-md">
                        <span className="text-[7px] font-black uppercase text-gray-500 truncate max-w-[60%]">{item.fileName}</span>
                        <span className="text-[7px] font-black text-primary">{item.fileSize}</span>
                    </div>
                  </div>

                  {/* Fields Section */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Description</label>
                        <input 
                            type="text" 
                            value={item.description} 
                            onChange={e => handleUpdateItem(item.tempId, { description: e.target.value })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-xs font-bold dark:text-white outline-none" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Amount</label>
                        <input 
                            type="number" 
                            value={item.amount || ''} 
                            onChange={e => handleUpdateItem(item.tempId, { amount: parseFloat(e.target.value) })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-xs font-black dark:text-white outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Date</label>
                        <input 
                            type="date" 
                            value={item.date?.split('T')[0]} 
                            onChange={e => handleUpdateItem(item.tempId, { date: e.target.value })} 
                            className="w-full bg-gray-50 dark:bg-violet-950 px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-primary/10 text-xs font-bold dark:text-white outline-none" 
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                       <select 
                          value={item.category} 
                          onChange={e => handleUpdateItem(item.tempId, { category: e.target.value })} 
                          className="bg-gray-100 dark:bg-violet-900 px-3 py-2 rounded-lg text-[9px] font-black uppercase outline-none"
                       >
                         <option value="Other">Category</option>
                         {categories.expense.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                       <button onClick={() => handleRemoveItem(item.tempId)} className="p-2 text-gray-400 hover:text-rose-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-50 dark:bg-violet-900/10 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-gray-100 dark:border-violet-800/50 min-h-[150px] flex items-center justify-center group"
              >
                <Plus size={32} className="text-gray-300 group-hover:text-primary transition-colors" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 md:p-8 border-t border-gray-100 dark:border-violet-800 bg-white dark:bg-violet-900/80 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-4">
             <div className="flex -space-x-3">
               {items.slice(0, 3).map((_, i) => <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-violet-900 bg-primary/20" />)}
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{items.filter(i => i.status === 'success').length} verified ready</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-4 text-[10px] font-black uppercase text-gray-400">Cancel</button>
            <button 
              onClick={handleImport} 
              disabled={items.filter(i => i.status === 'success').length === 0}
              className="flex-1 sm:flex-none px-10 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-xl disabled:opacity-50"
            >
              Commit All {items.filter(i => i.status === 'success').length > 0 ? `(${items.filter(i => i.status === 'success').length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
