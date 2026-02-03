import { useState, useRef, useEffect } from 'react';
import { Plus, X, Table2 } from 'lucide-react';

interface QuickTableDialogProps {
  position: { x: number; y: number };
  onCreateTable: (name: string) => void;
  onClose: () => void;
}

export function QuickTableDialog({ position, onCreateTable, onClose }: QuickTableDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateTable(name.trim());
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed z-[100] animate-slideIn"
      style={{ left: position.x, top: position.y }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 w-64"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Table2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-semibold text-white">New Table</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Table name (e.g. users)"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />

        <button
          type="submit"
          disabled={!name.trim()}
          className={`mt-2 w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
            name.trim()
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Create Table
        </button>

        <p className="text-[10px] text-slate-500 mt-1.5 text-center">
          Enter to create, Esc to cancel
        </p>
      </form>
    </div>
  );
}
