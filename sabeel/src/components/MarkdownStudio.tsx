import React, { useState } from 'react';
import { DocumentItem } from '../types';
import { 
  Plus, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Columns, 
  Eye, 
  Edit3, 
  BookOpen,
  Calendar,
  User
} from 'lucide-react';

interface MarkdownStudioProps {
  docs: DocumentItem[];
  onUpdateDocs: (docs: DocumentItem[]) => void;
  theme: 'dark' | 'light';
}

export const MarkdownStudio: React.FC<MarkdownStudioProps> = ({
  docs,
  onUpdateDocs,
  theme,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(docs[0]?.id || '');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);

  const activeDoc = docs.find((d) => d.id === selectedDocId) || docs[0];

  const handleUpdateActiveDoc = (partial: Partial<DocumentItem>) => {
    if (!activeDoc) return;
    const updated = docs.map((d) => (d.id === activeDoc.id ? { ...d, ...partial, updatedAt: new Date().toISOString().split('T')[0] } : d));
    onUpdateDocs(updated);
  };

  const handleCreateDoc = () => {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: 'Untitled Specification',
      category: 'General',
      author: 'Elena Vance',
      updatedAt: new Date().toISOString().split('T')[0],
      content: `# Untitled Specification\n\n## 1. Problem Statement\nDescribe the technical challenge, scope, and non-goals.\n\n## 2. Proposed Architecture\n- Subsystem A\n- Subsystem B\n\n\`\`\`typescript\n// Example code or contract\ninterface EngineConfig {\n  concurrency: number;\n  timeoutMs: number;\n}\n\`\`\`\n\n## 3. Decision Log\n- Approved on ${new Date().toISOString().split('T')[0]}\n`,
    };
    onUpdateDocs([newDoc, ...docs]);
    setSelectedDocId(newDoc.id);
  };

  const handleDeleteDoc = (id: string) => {
    if (docs.length <= 1) return;
    const remaining = docs.filter((d) => d.id !== id);
    onUpdateDocs(remaining);
    if (selectedDocId === id) {
      setSelectedDocId(remaining[0].id);
    }
  };

  const handleCopyContent = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Word count & read time calculations
  const text = activeDoc?.content || '';
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readTimeMin = Math.ceil(wordCount / 200);

  // Render markdown parser (lightweight, zero dependency, secure HTML generator)
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="p-3 my-3 rounded-lg bg-neutral-900 text-neutral-100 text-xs font-mono overflow-x-auto border border-neutral-800">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-xl font-bold tracking-tight mt-6 mb-3 text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-base font-semibold tracking-tight mt-5 mb-2 text-neutral-900 dark:text-neutral-100">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-sm font-semibold mt-4 mb-2 text-neutral-900 dark:text-neutral-200">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-5 list-disc text-xs text-neutral-700 dark:text-neutral-300 my-1 leading-relaxed">
            {line.replace(/^[-*]\s+/, '')}
          </li>
        );
      } else if (line.trim().startsWith('>')) {
        elements.push(
          <blockquote key={index} className="border-l-2 border-blue-500 pl-3 my-2 text-xs italic text-neutral-500 dark:text-neutral-400">
            {line.replace(/^>\s*/, '')}
          </blockquote>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-2" />);
      } else {
        elements.push(
          <p key={index} className="text-xs text-neutral-700 dark:text-neutral-300 my-1.5 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Sidebar: Documents list */}
      <div className={`w-64 border-r flex flex-col shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50/70 border-neutral-200'
      }`}>
        <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
          theme === 'dark' ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <span className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Specifications ({docs.length})
          </span>
          <button
            onClick={handleCreateDoc}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {docs.map((doc) => {
            const isSelected = doc.id === activeDoc?.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-2.5 rounded-lg cursor-pointer transition-colors text-xs group flex items-start justify-between gap-2 ${
                  isSelected
                    ? theme === 'dark'
                      ? 'bg-neutral-800 text-white font-medium shadow-sm'
                      : 'bg-white text-neutral-900 font-medium shadow-sm border border-neutral-200'
                    : theme === 'dark'
                      ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <div className="truncate">
                  <p className="truncate text-xs">{doc.title}</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5 tabular-nums">
                    {doc.updatedAt} · {doc.category}
                  </p>
                </div>

                {docs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity"
                    title="Delete document"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Viewport */}
      {activeDoc ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Doc Subheader */}
          <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors ${
            theme === 'dark' ? 'bg-neutral-950/40 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={activeDoc.title}
                onChange={(e) => handleUpdateActiveDoc({ title: e.target.value })}
                className="text-sm font-semibold bg-transparent focus:outline-none border-b border-transparent hover:border-neutral-700 focus:border-blue-500 transition-colors w-72"
              />
              <span className="text-xs font-mono text-neutral-500 tabular-nums">
                {wordCount} words · {readTimeMin} min read
              </span>
            </div>

            {/* Controls: Mode Switcher + Export */}
            <div className="flex items-center gap-2">
              {/* Segmented view controls */}
              <div className={`flex items-center p-0.5 rounded-md border text-xs ${
                theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
              }`}>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'edit'
                      ? theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                  title="Editor Only"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'split'
                      ? theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                  title="Split View"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'preview'
                      ? theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                  title="Rendered Preview Only"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Copy Markdown */}
              <button
                onClick={handleCopyContent}
                className={`p-1.5 rounded-md border transition-colors ${
                  theme === 'dark' ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
                title="Copy Markdown to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Download .md */}
              <button
                onClick={handleDownloadMd}
                className={`p-1.5 rounded-md border transition-colors ${
                  theme === 'dark' ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
                title="Download as .md file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Editor & Preview Pane */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Markdown Textarea */}
            {(viewMode === 'split' || viewMode === 'edit') && (
              <div className={`flex-1 flex flex-col p-6 overflow-hidden ${
                viewMode === 'split' ? 'border-r border-inherit' : ''
              }`}>
                <textarea
                  value={activeDoc.content}
                  onChange={(e) => handleUpdateActiveDoc({ content: e.target.value })}
                  placeholder="Type markdown specifications..."
                  className={`w-full h-full font-mono text-xs leading-relaxed bg-transparent resize-none focus:outline-none ${
                    theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                  spellCheck={false}
                />
              </div>
            )}

            {/* Rendered Preview */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div className={`flex-1 p-8 overflow-y-auto ${
                theme === 'dark' ? 'bg-neutral-950/20' : 'bg-neutral-50/40'
              }`}>
                <div className="max-w-2xl mx-auto">
                  {renderMarkdown(activeDoc.content)}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
          No document selected.
        </div>
      )}
    </div>
  );
};
