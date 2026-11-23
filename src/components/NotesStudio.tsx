import React, { useState } from 'react';
import { Note } from '../types';
import {
  Plus,
  Trash2,
  Pin,
  FileText,
  Download,
  Eye,
  Edit3,
  Columns,
  Search,
  Bold,
  Italic,
  Heading2,
  List,
  Quote,
  Code
} from 'lucide-react';

interface NotesStudioProps {
  notes: Note[];
  onUpdateNotes: (notes: Note[]) => void;
}

export const NotesStudio: React.FC<NotesStudioProps> = ({ notes, onUpdateNotes }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    notes.length > 0 ? notes[0].id : ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateNote = () => {
    const newNote: Note = {
      id: 'note-' + Date.now(),
      title: 'Untitled Document',
      content: `# Untitled Document\n\nBegin typing your notes here...`,
      category: 'General',
      pinned: false,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      tags: ['Draft'],
    };
    onUpdateNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateCurrentNote = (field: keyof Note, value: unknown) => {
    if (!selectedNote) return;
    const updated = notes.map((n) =>
      n.id === selectedNote.id
        ? {
            ...n,
            [field]: value,
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          }
        : n
    );
    onUpdateNotes(updated);
  };

  const handleDeleteNote = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id);
    onUpdateNotes(remaining);
    if (selectedNoteId === id && remaining.length > 0) {
      setSelectedNoteId(remaining[0].id);
    }
  };

  const handleTogglePin = (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    // Sort pinned to top
    updated.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    onUpdateNotes(updated);
  };

  const handleExportMarkdown = () => {
    if (!selectedNote) return;
    const blob = new Blob([selectedNote.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedNote.title.toLowerCase().replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Quick formatting insert
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement | null;
    if (!textarea || !selectedNote) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedNote.content;
    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || 'text') + suffix;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateCurrentNote('content', newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 10);
  };

  // Word count & read time
  const wordCount = selectedNote ? selectedNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTimeMin = Math.ceil(wordCount / 200);

  // Simple Markdown renderer
  const renderMarkdown = (content: string) => {
    return content
      .split('\n')
      .map((line, idx) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-3 mt-4">
              {line.replace('# ', '')}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2 mt-4">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-2 mt-3">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
          const checked = line.startsWith('- [x] ');
          const text = line.replace(/- \[[x ]\] /, '');
          return (
            <div key={idx} className="flex items-center gap-2 py-0.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={checked} readOnly className="rounded text-neutral-900" />
              <span className={checked ? 'line-through text-neutral-400' : ''}>{text}</span>
            </div>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {line.replace('- ', '')}
            </li>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="pl-3 border-l-2 border-neutral-400 dark:border-neutral-600 italic text-neutral-600 dark:text-neutral-400 my-2 text-xs sm:text-sm">
              {line.replace('> ', '')}
            </blockquote>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1">
            {line}
          </p>
        );
      });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] min-h-[550px] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
      {/* Sidebar List (280px) */}
      <div className="w-full lg:w-72 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/40">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Documents & Notes
            </h3>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md focus:outline-none"
            />
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">
              No matching notes found.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3 cursor-pointer transition-colors text-left group ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                      {note.title}
                    </h4>
                    {note.pinned && (
                      <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`_]/g, '')}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-2 font-mono tabular-nums">
                    <span>{note.updatedAt.slice(0, 10)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{note.category}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor & Preview Pane */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
          {/* Document Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => handleUpdateCurrentNote('title', e.target.value)}
                placeholder="Document Title"
                className="text-sm sm:text-base font-semibold bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              {/* Word & Read Time */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono tabular-nums pr-2 border-r border-neutral-200 dark:border-neutral-800">
                <span>{wordCount} words</span>
                <span aria-hidden="true">·</span>
                <span>{readTimeMin} min read</span>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                <button
                  onClick={() => setViewMode('edit')}
                  title="Editor Only"
                  className={`p-1 rounded ${viewMode === 'edit' ? 'bg-white dark:bg-neutral-700 shadow-xs text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  title="Side-by-Side Split"
                  className={`p-1 rounded ${viewMode === 'split' ? 'bg-white dark:bg-neutral-700 shadow-xs text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  title="Preview Only"
                  className={`p-1 rounded ${viewMode === 'preview' ? 'bg-white dark:bg-neutral-700 shadow-xs text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pin */}
              <button
                onClick={() => handleTogglePin(selectedNote.id)}
                title={selectedNote.pinned ? 'Unpin document' : 'Pin document'}
                className={`p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                  selectedNote.pinned ? 'text-amber-500' : 'text-neutral-400'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Export Markdown */}
              <button
                onClick={handleExportMarkdown}
                title="Download Markdown (.md)"
                className="p-1.5 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDeleteNote(selectedNote.id)}
                title="Delete document"
                className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Formatting Bar (visible if edit or split mode) */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="flex items-center gap-1 px-4 py-1.5 bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
              <button
                onClick={() => insertFormatting('**', '**')}
                title="Bold"
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('*', '*')}
                title="Italic"
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('## ')}
                title="Heading 2"
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('- ')}
                title="Bullet List"
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('> ')}
                title="Quote"
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('`', '`')}
                title="Inline Code"
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Content Body Pane */}
          <div className="flex-1 flex overflow-hidden">
            {/* Markdown Source Editor */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div
                className={`h-full ${
                  viewMode === 'split' ? 'w-1/2 border-r border-neutral-200 dark:border-neutral-800' : 'w-full'
                } p-4 overflow-y-auto`}
              >
                <textarea
                  id="note-textarea"
                  value={selectedNote.content}
                  onChange={(e) => handleUpdateCurrentNote('content', e.target.value)}
                  placeholder="Type markdown content..."
                  className="w-full h-full bg-transparent resize-none text-xs sm:text-sm font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed focus:outline-none"
                />
              </div>
            )}

            {/* Markdown Formatted Preview */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`h-full ${
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                } p-6 overflow-y-auto bg-neutral-50/30 dark:bg-neutral-950/20`}
              >
                {renderMarkdown(selectedNote.content)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
          No document selected. Click "+ New" to create one.
        </div>
      )}
    </div>
  );
};
