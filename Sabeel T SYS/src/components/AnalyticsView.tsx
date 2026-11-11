import React from 'react';
import { WorkspaceData, Task } from '../types';
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  GitGraph,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

interface AnalyticsViewProps {
  data: WorkspaceData;
  onResetToDefault: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  data,
  onResetToDefault,
  onExportJSON,
  onImportJSON,
}) => {
  const { tasks, nodes, connections, notes, focusSessions, totalFocusMinutes } = data;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority counts
  const urgentCount = tasks.filter((t) => t.priority === 'urgent').length;
  const highCount = tasks.filter((t) => t.priority === 'high').length;
  const mediumCount = tasks.filter((t) => t.priority === 'medium').length;
  const lowCount = tasks.filter((t) => t.priority === 'low').length;

  // Upcoming deadlines sorted
  const sortedTasks = [...tasks]
    .filter((t) => t.dueDate && t.status !== 'done')
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

  const calculateDaysRemaining = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 4 Top Primary Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <span className="text-xs font-medium text-neutral-500 block mb-1">
            Execution Velocity
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {completionRate}%
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-neutral-900 dark:bg-neutral-100 h-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <span className="text-xs font-medium text-neutral-500 block mb-1">
            Focus Time Logged
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {focusSessions} sessions
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-3">
            Procedural deep work sessions
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <span className="text-xs font-medium text-neutral-500 block mb-1">
            Idea Graph Density
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {nodes.length}
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {connections.length} links
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-3">
            Active canvas spatial nodes
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <span className="text-xs font-medium text-neutral-500 block mb-1">
            Strategic Documentation
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {notes.length}
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {notes.reduce((acc, n) => acc + n.content.split(/\s+/).length, 0)} words
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-3">
            Markdown specs & architecture
          </p>
        </div>
      </div>

      {/* Mid Section: Task Pipeline Distribution & Priority Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Distribution (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Pipeline Stage Breakdown
            </h3>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {tasks.length} total units
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { id: 'backlog', label: 'Backlog', count: tasks.filter((t) => t.status === 'backlog').length },
              { id: 'todo', label: 'To Do', count: tasks.filter((t) => t.status === 'todo').length },
              { id: 'in_progress', label: 'In Progress', count: inProgressTasks },
              { id: 'review', label: 'In Review', count: tasks.filter((t) => t.status === 'review').length },
              { id: 'done', label: 'Completed', count: completedTasks },
            ].map((stage) => {
              const pct = totalTasks > 0 ? Math.round((stage.count / totalTasks) * 100) : 0;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {stage.label}
                    </span>
                    <span className="font-mono text-neutral-400 tabular-nums">
                      {stage.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-800 dark:bg-neutral-200 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Allocation (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Priority Allocation
            </h3>
            <span className="text-xs font-mono text-neutral-400">Triage matrix</span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-medium text-rose-600 dark:text-rose-400">Urgent</span>
              <span className="font-mono font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {urgentCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-medium text-amber-600 dark:text-amber-400">High</span>
              <span className="font-mono font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {highCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Medium</span>
              <span className="font-mono font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {mediumCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-medium text-neutral-400 dark:text-neutral-500">Low</span>
              <span className="font-mono font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {lowCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines Ledger */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Pending Milestones & Deadlines
          </h3>
          <span className="text-xs font-mono text-neutral-400 tabular-nums">
            {sortedTasks.length} open commitments
          </span>
        </div>

        {sortedTasks.length === 0 ? (
          <p className="text-xs text-neutral-400 py-3">All scheduled tasks completed.</p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {sortedTasks.slice(0, 5).map((task) => {
              const days = calculateDaysRemaining(task.dueDate);
              return (
                <div key={task.id} className="flex items-center justify-between py-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {task.title}
                    </span>
                    <span className="text-[11px] text-neutral-400">· {task.tags.join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-neutral-500 tabular-nums">
                      {task.dueDate}
                    </span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        days < 0
                          ? 'text-rose-600 font-semibold'
                          : days <= 2
                          ? 'text-amber-600 font-medium'
                          : 'text-neutral-400'
                      }`}
                    >
                      {days < 0
                        ? `${Math.abs(days)}d overdue`
                        : days === 0
                        ? 'due today'
                        : `in ${days}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workspace Data Management (Backup, Restore, Reset) */}
      <div className="p-6 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Workspace Portability & Backup
            </h3>
            <p className="text-xs text-neutral-500">
              Export your full workspace state to a JSON file or restore from a previous backup.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onExportJSON}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup JSON</span>
          </button>

          <label className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={onResetToDefault}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-colors ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
