import React, { useState } from 'react';
import { ActiveView } from '../types';
import { 
  Plus, 
  Search, 
  Sun, 
  Moon, 
  Command, 
  Download, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onExportData: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onOpenQuickAdd,
  onOpenCommandPalette,
  theme,
  setTheme,
  onExportData,
  onResetData,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'board', label: 'Sprint Board' },
    { id: 'canvas', label: 'Spatial Canvas' },
    { id: 'docs', label: 'Specs & Docs' },
    { id: 'focus', label: 'Deep Work' },
    { id: 'metrics', label: 'Analytics' },
  ];

  return (
    <header className={`h-14 border-b shrink-0 px-6 flex items-center justify-between transition-colors z-40 select-none ${
      theme === 'dark' 
        ? 'bg-neutral-950/90 border-neutral-800/80 backdrop-blur-md text-neutral-100' 
        : 'bg-white/90 border-neutral-200/80 backdrop-blur-md text-neutral-900'
    }`}>
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a 
          href="#home"
          onClick={(e) => { e.preventDefault(); setActiveView('board'); }}
          className="text-lg font-bold tracking-tight hover:opacity-85 transition-opacity flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
          <span>Stratos</span>
        </a>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-900 shadow-sm'
                  : theme === 'dark'
                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1-2 primary actions + utilities */}
      <div className="flex items-center gap-2">
        {/* Command palette search shortcut */}
        <button
          onClick={onOpenCommandPalette}
          className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
            theme === 'dark'
              ? 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
          }`}
          title="Command Palette (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono text-[11px] opacity-70">⌘K</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-1.5 rounded-md border transition-colors ${
            theme === 'dark'
              ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
          }`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Item</span>
        </button>

        {/* Profile Avatar with fallback container */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="w-7 h-7 rounded-full overflow-hidden border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center bg-neutral-800"
            title="User Profile & Settings"
          >
            {!avatarFailed ? (
              <img
                src="/src/assets/images/avatar_lead_architect_1790435971333.jpg"
                alt="Lead Architect Profile"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-neutral-300">EV</span>
            )}
          </button>

          {showSettingsMenu && (
            <div 
              className={`absolute right-0 mt-2 w-48 rounded-lg shadow-xl border py-1 z-50 text-xs ${
                theme === 'dark' 
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-200' 
                  : 'bg-white border-neutral-200 text-neutral-800'
              }`}
            >
              <div className="px-3 py-2 border-b border-inherit">
                <p className="font-semibold">Elena Vance</p>
                <p className="text-[11px] text-neutral-500">Design Systems Lead</p>
              </div>

              <button
                onClick={() => {
                  onExportData();
                  setShowSettingsMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-neutral-800/40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset workspace data back to curated template?')) {
                    onResetData();
                  }
                  setShowSettingsMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-500 hover:bg-neutral-800/40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Seed Data</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
