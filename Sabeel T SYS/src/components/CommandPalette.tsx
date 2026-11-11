import React, { useState, useEffect, useRef } from 'react';
import { ActiveView, Task, DocumentItem } from '../types';
import { 
  Search, 
  LayoutGrid, 
  PenTool, 
  FileText, 
  Timer, 
  BarChart3, 
  Plus, 
  Download, 
  X,
  ArrowRight
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveView: (view: ActiveView) => void;
  onOpenQuickAdd: () => void;
  onStartFocus: () => void;
  onExport: () => void;
  tasks: Task[];
  docs: DocumentItem[];
  theme: 'dark' | 'light';
  onSelectTask?: (task: Task) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setActiveView,
  onOpenQuickAdd,
  onStartFocus,
  onExport,
  tasks,
  docs,
  theme,
  onSelectTask,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseActions = [
    {
      id: 'view-board',
      title: 'Navigate to Sprint Board',
      category: 'Navigation',
      icon: <LayoutGrid className="w-4 h-4" />,
      perform: () => { setActiveView('board'); onClose(); }
    },
    {
      id: 'view-canvas',
      title: 'Open Spatial Canvas',
      category: 'Navigation',
      icon: <PenTool className="w-4 h-4" />,
      perform: () => { setActiveView('canvas'); onClose(); }
    },
    {
      id: 'view-docs',
      title: 'Browse Specs & Docs',
      category: 'Navigation',
      icon: <FileText className="w-4 h-4" />,
      perform: () => { setActiveView('docs'); onClose(); }
    },
    {
      id: 'view-focus',
      title: 'Enter Deep Work Flow Deck',
      category: 'Navigation',
      icon: <Timer className="w-4 h-4" />,
      perform: () => { setActiveView('focus'); onClose(); }
    },
    {
      id: 'view-metrics',
      title: 'View Analytics & Velocity',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4" />,
      perform: () => { setActiveView('metrics'); onClose(); }
    },
    {
      id: 'action-quick-add',
      title: 'Create New Task / Note',
      category: 'Actions',
      icon: <Plus className="w-4 h-4" />,
      perform: () => { onClose(); onOpenQuickAdd(); }
    },
    {
      id: 'action-start-focus',
      title: 'Start 25m Focus Block with Audio',
      category: 'Actions',
      icon: <Timer className="w-4 h-4" />,
      perform: () => { onClose(); onStartFocus(); }
    },
    {
      id: 'action-export',
      title: 'Export Workspace Data as JSON',
      category: 'Actions',
      icon: <Download className="w-4 h-4" />,
      perform: () => { onClose(); onExport(); }
    },
  ];

  const taskResults = tasks
    .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 4)
    .map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      category: `Task (${t.status})`,
      icon: <LayoutGrid className="w-4 h-4 text-blue-400" />,
      perform: () => {
        setActiveView('board');
        if (onSelectTask) onSelectTask(t);
        onClose();
      }
    }));

  const docResults = docs
    .filter(d => d.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .map(d => ({
      id: `doc-${d.id}`,
      title: d.title,
      category: 'Document',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      perform: () => {
        setActiveView('docs');
        onClose();
      }
    }));

  const filteredItems = query.trim() === '' 
    ? baseActions 
    : [
        ...baseActions.filter(a => a.title.toLowerCase().includes(query.toLowerCase())),
        ...taskResults,
        ...docResults
      ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].perform();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden transition-all ${
          theme === 'dark' 
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-inherit gap-3">
          <Search className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search tasks, or docs..."
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
          />
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No matching commands or entities found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.perform}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    isSelected
                      ? theme === 'dark' 
                        ? 'bg-neutral-800 text-white' 
                        : 'bg-neutral-100 text-neutral-950 font-medium'
                      : theme === 'dark' 
                        ? 'text-neutral-300 hover:bg-neutral-800/50' 
                        : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="shrink-0 text-neutral-400">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-500">{item.category}</span>
                    {isSelected && <ArrowRight className="w-3 h-3 text-neutral-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className={`px-3 py-2 border-t border-inherit flex items-center justify-between text-[11px] text-neutral-500 ${
          theme === 'dark' ? 'bg-neutral-950/40' : 'bg-neutral-50'
        }`}>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-mono">Stratos v1.0</span>
        </div>
      </div>
    </div>
  );
};
