import React, { useState } from 'react';
import { Task, TaskStatus, Priority, CanvasNode, DocumentItem } from '../types';
import { X, Check } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
  onAddTask: (task: Task) => void;
  onAddCanvasNode: (node: CanvasNode) => void;
  theme: 'dark' | 'light';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  defaultStatus = 'backlog',
  onAddTask,
  onAddCanvasNode,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'task' | 'canvas'>('task');
  
  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('P1');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(defaultStatus);
  const [taskTags, setTaskTags] = useState('Frontend, Core');
  const [taskEstHours, setTaskEstHours] = useState('4');
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Canvas note form state
  const [canvasTitle, setCanvasTitle] = useState('');
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasColor, setCanvasColor] = useState('#f59e0b');

  if (!isOpen) return null;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const parsedTags = taskTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: taskStatus,
      priority: taskPriority,
      tags: parsedTags.length > 0 ? parsedTags : ['General'],
      assignee: { name: 'Elena Vance' },
      estimatedHours: parseFloat(taskEstHours) || 2,
      loggedHours: 0,
      dueDate: taskDueDate,
      checklist: [
        { id: `c-${Date.now()}-1`, text: 'Initial scoping and technical review', completed: false },
      ],
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddTask(newTask);
    onClose();
  };

  const handleCreateCanvasNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasTitle.trim()) return;

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: 'sticky',
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 100,
      width: 200,
      height: 150,
      title: canvasTitle.trim(),
      content: canvasContent.trim() || 'No description provided.',
      color: canvasColor,
    };

    onAddCanvasNode(newNode);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg rounded-xl shadow-2xl border p-6 overflow-hidden ${
          theme === 'dark' 
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Segmented Tab */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit">
          <div className="flex items-center gap-1 p-0.5 rounded-lg border text-xs border-inherit">
            <button
              onClick={() => setActiveTab('task')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'task'
                  ? theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-neutral-100 text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Sprint Task
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'canvas'
                  ? theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-neutral-100 text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Canvas Sticky
            </button>
          </div>

          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Form */}
        {activeTab === 'task' ? (
          <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Memory profiling on instanced particle canvas"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-neutral-100' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Description & Constraints
              </label>
              <textarea
                rows={2}
                placeholder="Key technical scope, acceptance criteria, or dependencies..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-neutral-100' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as Priority)}
                  className={`w-full p-2 rounded-md border focus:outline-none ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <option value="P0">P0 Blocker</option>
                  <option value="P1">P1 High</option>
                  <option value="P2">P2 Normal</option>
                  <option value="P3">P3 Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Target Stage</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className={`w-full p-2 rounded-md border focus:outline-none ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={taskEstHours}
                  onChange={(e) => setTaskEstHours(e.target.value)}
                  className={`w-full p-2 rounded-md border focus:outline-none font-mono ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className={`w-full p-2 rounded-md border focus:outline-none font-mono text-[11px] ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">
                Domain Tags (comma-separated)
              </label>
              <input
                type="text"
                value={taskTags}
                onChange={(e) => setTaskTags(e.target.value)}
                placeholder="Core, Graphics, Security"
                className={`w-full p-2 rounded-md border text-xs focus:outline-none ${
                  theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              />
            </div>

            <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  theme === 'dark' ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm"
              >
                Create Task
              </button>
            </div>
          </form>
        ) : (
          /* Canvas Sticky Form */
          <form onSubmit={handleCreateCanvasNode} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Note Title *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Architectural Tradeoff"
                value={canvasTitle}
                onChange={(e) => setCanvasTitle(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-neutral-100' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Content
              </label>
              <textarea
                rows={3}
                placeholder="Enter sticky note thoughts or ideas..."
                value={canvasContent}
                onChange={(e) => setCanvasContent(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-neutral-100' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Card Color
              </label>
              <div className="flex items-center gap-2">
                {[
                  { color: '#f59e0b', label: 'Amber' },
                  { color: '#3b82f6', label: 'Cobalt' },
                  { color: '#10b981', label: 'Emerald' },
                  { color: '#ec4899', label: 'Rose' },
                  { color: '#06b6d4', label: 'Cyan' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setCanvasColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform ${
                      canvasColor === c.color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : ''
                    }`}
                  >
                    {canvasColor === c.color && <Check className="w-3 h-3 text-neutral-900" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  theme === 'dark' ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm"
              >
                Place on Canvas
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
