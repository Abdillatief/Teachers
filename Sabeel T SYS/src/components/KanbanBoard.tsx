import React, { useState } from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  MoreHorizontal,
  Trash2,
  Edit2,
  Calendar,
  User,
  Filter
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onSelectTaskForFocus?: (task: Task) => void;
  theme: 'dark' | 'light';
  onOpenNewTaskModal: (defaultStatus?: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateTasks,
  onSelectTaskForFocus,
  theme,
  onOpenNewTaskModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'review', title: 'Review & QA' },
    { id: 'completed', title: 'Completed' },
  ];

  // Unique tags across tasks
  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags)));

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      selectedPriority === 'all' || task.priority === selectedPriority;
    const matchesTag =
      selectedTag === 'all' || task.tags.includes(selectedTag);
    return matchesQuery && matchesPriority && matchesTag;
  });

  const moveTask = (taskId: string, direction: 'prev' | 'next') => {
    const colOrder: TaskStatus[] = ['backlog', 'in_progress', 'review', 'completed'];
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const currentIndex = colOrder.indexOf(t.status);
        const newIndex = direction === 'next' 
          ? Math.min(colOrder.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
        return { ...t, status: colOrder[newIndex] };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  const handleToggleChecklist = (taskId: string, checklistId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextChecklist = t.checklist.map((item) =>
          item.id === checklistId ? { ...item, completed: !item.completed } : item
        );
        return { ...t, checklist: nextChecklist };
      }
      return t;
    });
    onUpdateTasks(updated);
    if (editingTask && editingTask.id === taskId) {
      setEditingTask(updated.find(t => t.id === taskId) || null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateTasks(tasks.filter((t) => t.id !== taskId));
    if (editingTask?.id === taskId) setEditingTask(null);
  };

  const handleSaveEditedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const updated = tasks.map((t) => (t.id === editingTask.id ? editingTask : t));
    onUpdateTasks(updated);
    setEditingTask(null);
  };

  // Metrics summary
  const totalEst = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top action & metrics row */}
      <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors ${
        theme === 'dark' ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50/70'
      }`}>
        {/* Left: Search & Segmented filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs w-64 ${
            theme === 'dark' 
              ? 'bg-neutral-900 border-neutral-800 text-neutral-200' 
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="Search sprint tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full focus:outline-none placeholder:text-neutral-500"
            />
          </div>

          {/* Priority filter buttons */}
          <div className={`flex items-center gap-1 p-0.5 rounded-md border text-xs ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            {['all', 'P0', 'P1', 'P2', 'P3'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedPriority === p
                    ? theme === 'dark'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>

          {/* Tag filter dropdown */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className={`px-2.5 py-1.5 text-xs rounded-md border focus:outline-none cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-300' 
                  : 'bg-white border-neutral-200 text-neutral-700'
              }`}
            >
              <option value="all">All Tags ({allTags.length})</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Unboxed tabular sprint telemetry */}
        <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono tabular-nums">
          <div className="flex items-center gap-1.5">
            <span>Completed</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
              {completedCount}/{tasks.length}
            </span>
          </div>
          <span aria-hidden="true" className="text-neutral-400">·</span>
          <div className="flex items-center gap-1.5">
            <span>Estimated</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
              {totalEst.toFixed(1)}h
            </span>
          </div>
          <span aria-hidden="true" className="text-neutral-400">·</span>
          <div className="flex items-center gap-1.5">
            <span>Logged</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
              {totalLogged.toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Viewport */}
      <div className="flex-1 p-6 overflow-x-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 min-w-[960px] h-full">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const colHours = colTasks.reduce((acc, curr) => acc + (curr.estimatedHours || 0), 0);

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-xl border transition-colors min-h-0 overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-neutral-900/40 border-neutral-800/80'
                    : 'bg-neutral-50/60 border-neutral-200/90'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
                  theme === 'dark' ? 'border-neutral-800' : 'border-neutral-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                      {col.title}
                    </span>
                    {/* Unboxed count */}
                    <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                      ({colTasks.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                      {colHours}h
                    </span>
                    <button
                      onClick={() => onOpenNewTaskModal(col.id)}
                      className={`p-1 rounded transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 ${
                        theme === 'dark' ? 'hover:bg-neutral-800' : 'hover:bg-neutral-200'
                      }`}
                      title={`Add task to ${col.title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-0">
                  {colTasks.length === 0 ? (
                    <div className="h-32 border border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center border-neutral-300 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600">
                      <p className="text-xs">No tasks in {col.title}</p>
                      <button
                        onClick={() => onOpenNewTaskModal(col.id)}
                        className="mt-2 text-[11px] font-medium text-blue-500 hover:underline"
                      >
                        + Create First Task
                      </button>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const completedChecks = task.checklist.filter((c) => c.completed).length;
                      const hasChecks = task.checklist.length > 0;

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-lg border transition-all hover:border-neutral-400 dark:hover:border-neutral-600 cursor-pointer shadow-sm group ${
                            theme === 'dark'
                              ? 'bg-neutral-900 border-neutral-800 text-neutral-200'
                              : 'bg-white border-neutral-200 text-neutral-800'
                          }`}
                          onClick={() => setEditingTask(task)}
                        >
                          {/* Card Lead: Title without badge sandwich */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100">
                              {task.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200 transition-opacity"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Task Description snippet */}
                          {task.description && (
                            <p className="mt-1.5 text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Zero-Pill Unboxed Metadata with typographic separators */}
                          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 font-mono tabular-nums">
                            {/* Priority label */}
                            <span className={
                              task.priority === 'P0' 
                                ? 'text-rose-500 font-semibold' 
                                : task.priority === 'P1' 
                                  ? 'text-amber-500 font-medium' 
                                  : 'text-neutral-400'
                            }>
                              {task.priority}
                            </span>

                            <span aria-hidden="true" className="text-neutral-400">·</span>

                            {/* Tags list unboxed */}
                            <span className="truncate max-w-[120px] text-neutral-400">
                              {task.tags.join(', ')}
                            </span>

                            <span aria-hidden="true" className="text-neutral-400">·</span>

                            {/* Hours estimation */}
                            <span>
                              {task.loggedHours}/{task.estimatedHours}h
                            </span>

                            {hasChecks && (
                              <>
                                <span aria-hidden="true" className="text-neutral-400">·</span>
                                <span className={completedChecks === task.checklist.length ? 'text-emerald-500' : ''}>
                                  {completedChecks}/{task.checklist.length}✓
                                </span>
                              </>
                            )}
                          </div>

                          {/* Action Footer: Stage shift buttons + Focus action */}
                          <div 
                            className="mt-2.5 pt-2 flex items-center justify-between border-t border-inherit text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              {col.id !== 'backlog' && (
                                <button
                                  onClick={() => moveTask(task.id, 'prev')}
                                  className="p-1 rounded hover:bg-neutral-800/40 text-neutral-500 hover:text-neutral-300"
                                  title="Move to previous stage"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {col.id !== 'completed' && (
                                <button
                                  onClick={() => moveTask(task.id, 'next')}
                                  className="p-1 rounded hover:bg-neutral-800/40 text-neutral-500 hover:text-neutral-300"
                                  title="Advance to next stage"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {onSelectTaskForFocus && (
                              <button
                                onClick={() => onSelectTaskForFocus(task)}
                                className="text-[10px] text-blue-500 hover:text-blue-400 font-medium hover:underline"
                              >
                                Focus on this
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Edit & Details Modal */}
      {editingTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100"
          onClick={() => setEditingTask(null)}
        >
          <div 
            className={`w-full max-w-lg rounded-xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto space-y-4 ${
              theme === 'dark' 
                ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-inherit pb-3">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                  Task Specification · {editingTask.status}
                </span>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1 w-full text-base font-semibold bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => handleDeleteTask(editingTask.id)}
                className="p-1.5 text-neutral-500 hover:text-rose-500 rounded transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Description
              </label>
              <textarea
                value={editingTask.description}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                rows={3}
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none ${
                  theme === 'dark'
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-200 focus:border-blue-500'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-800 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Row of metadata inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Priority</label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as Priority })}
                  className={`w-full p-1.5 rounded border focus:outline-none ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <option value="P0">P0 Urgent</option>
                  <option value="P1">P1 High</option>
                  <option value="P2">P2 Normal</option>
                  <option value="P3">P3 Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Stage</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                  className={`w-full p-1.5 rounded border focus:outline-none ${
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
                  value={editingTask.estimatedHours}
                  onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                  className={`w-full p-1.5 rounded border focus:outline-none font-mono ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Logged Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingTask.loggedHours}
                  onChange={(e) => setEditingTask({ ...editingTask, loggedHours: parseFloat(e.target.value) || 0 })}
                  className={`w-full p-1.5 rounded border focus:outline-none font-mono ${
                    theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-neutral-400">
                  Acceptance Criteria & Subtasks
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newItem = {
                      id: `check-${Date.now()}`,
                      text: 'New checklist item',
                      completed: false,
                    };
                    setEditingTask({
                      ...editingTask,
                      checklist: [...editingTask.checklist, newItem],
                    });
                  }}
                  className="text-[11px] text-blue-500 hover:underline"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {editingTask.checklist.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(editingTask.id, item.id)}
                      className="rounded border-neutral-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const next = [...editingTask.checklist];
                        next[idx] = { ...item, text: e.target.value };
                        setEditingTask({ ...editingTask, checklist: next });
                      }}
                      className="w-full bg-transparent border-b border-transparent hover:border-neutral-700 focus:outline-none focus:border-blue-500 py-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask({
                          ...editingTask,
                          checklist: editingTask.checklist.filter((c) => c.id !== item.id),
                        });
                      }}
                      className="text-neutral-500 hover:text-rose-500 p-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions footer */}
            <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  theme === 'dark' ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTask}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
