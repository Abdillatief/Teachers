import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import {
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  ArrowUpDown
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onAddNewTaskWithStatus: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; description: string }[] = [
  { id: 'backlog', label: 'Backlog', description: 'Queued explorations' },
  { id: 'todo', label: 'To Do', description: 'Planned for sprint' },
  { id: 'in_progress', label: 'In Progress', description: 'Actively underway' },
  { id: 'review', label: 'In Review', description: 'Verification & audit' },
  { id: 'done', label: 'Completed', description: 'Shipped & closed' },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onAddNewTaskWithStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'alphabetical'>('date');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority =
        selectedPriority === 'all' || task.priority === selectedPriority;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, selectedPriority]);

  // Priority metadata styling (zero-pill discipline: unboxed text)
  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="font-medium text-rose-600 dark:text-rose-400">Urgent</span>;
      case 'high':
        return <span className="font-medium text-amber-600 dark:text-amber-400">High</span>;
      case 'medium':
        return <span className="text-neutral-600 dark:text-neutral-400">Medium</span>;
      case 'low':
        return <span className="text-neutral-400 dark:text-neutral-500">Low</span>;
    }
  };

  const moveTask = (task: Task, direction: 'next' | 'prev') => {
    const statusOrder: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < statusOrder.length) {
      onUpdateTask({ ...task, status: statusOrder[newIndex] });
    }
  };

  const handleToggleSubtaskQuick = (e: React.MouseEvent, task: Task, subtaskId: string) => {
    e.stopPropagation();
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Control & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter tasks by title, tag, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter tabs */}
          <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-xs font-medium">
            {['all', 'urgent', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2.5 py-1 capitalize rounded-md transition-colors ${
                  selectedPriority === p
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="text-xs text-neutral-500 font-mono tabular-nums px-2">
            {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="flex flex-col min-w-[260px] bg-neutral-100/60 dark:bg-neutral-900/40 rounded-xl p-3 border border-neutral-200/70 dark:border-neutral-800/80"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-200/60 dark:border-neutral-800/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {col.label}
                    </h3>
                    <span className="text-xs font-mono text-neutral-500 tabular-nums">
                      {colTasks.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">{col.description}</p>
                </div>

                <button
                  onClick={() => onAddNewTaskWithStatus(col.id)}
                  title={`Add task to ${col.label}`}
                  className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Cards Container */}
              <div className="space-y-2.5 flex-1 min-h-[160px]">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-xs text-neutral-400">
                    <span>No tasks in this lane</span>
                    <button
                      onClick={() => onAddNewTaskWithStatus(col.id)}
                      className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400 hover:underline"
                    >
                      + Add first item
                    </button>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
                    const hasSubtasks = task.subtasks.length > 0;
                    return (
                      <div
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className="group relative p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-all cursor-pointer"
                      >
                        {/* Title */}
                        <h4 className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 mb-1.5 group-hover:text-neutral-950 dark:group-hover:text-white">
                          {task.title}
                        </h4>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2.5">
                            {task.description}
                          </p>
                        )}

                        {/* Subtasks Preview Checklist if any */}
                        {hasSubtasks && (
                          <div className="mb-2.5 space-y-1">
                            <div className="text-[11px] text-neutral-400 flex items-center justify-between mb-1">
                              <span>Checklist</span>
                              <span className="font-mono tabular-nums">
                                {completedSubtasks}/{task.subtasks.length}
                              </span>
                            </div>
                            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-neutral-800 dark:bg-neutral-200 h-full transition-all"
                                style={{
                                  width: `${(completedSubtasks / task.subtasks.length) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Unboxed Metadata row (Zero-pill discipline) */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 border-t border-neutral-100 dark:border-neutral-800/80 pt-2 mt-2">
                          {getPriorityText(task.priority)}
                          <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                          
                          {task.dueDate && (
                            <span className="font-mono tabular-nums flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-neutral-400 inline" />
                              {task.dueDate.slice(5)}
                            </span>
                          )}

                          {task.tags.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                              <span>{task.tags.join(', ')}</span>
                            </>
                          )}
                        </div>

                        {/* Quick Move Arrows on hover */}
                        <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60 opacity-80 group-hover:opacity-100 transition-opacity">
                          {col.id !== 'backlog' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTask(task, 'prev');
                              }}
                              title="Move left"
                              className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTask(task, 'next');
                              }}
                              title="Move right"
                              className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              <ChevronRight className="w-3 h-3" />
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
  );
};
