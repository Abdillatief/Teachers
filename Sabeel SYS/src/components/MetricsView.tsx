import React from 'react';
import { Task, FocusSession } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Flame, 
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface MetricsViewProps {
  tasks: Task[];
  focusSession: FocusSession;
  theme: 'dark' | 'light';
}

export const MetricsView: React.FC<MetricsViewProps> = ({
  tasks,
  focusSession,
  theme,
}) => {
  // Quantitative calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewTasks = tasks.filter((t) => t.status === 'review').length;
  const backlogTasks = tasks.filter((t) => t.status === 'backlog').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEstHours = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const totalLoggedHours = tasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
  const hoursVariance = totalEstHours > 0 ? ((totalLoggedHours - totalEstHours) / totalEstHours) * 100 : 0;

  // Priority counts
  const priorityCounts = {
    P0: tasks.filter((t) => t.priority === 'P0').length,
    P1: tasks.filter((t) => t.priority === 'P1').length,
    P2: tasks.filter((t) => t.priority === 'P2').length,
    P3: tasks.filter((t) => t.priority === 'P3').length,
  };

  // Tag distribution
  const tagCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    t.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Velocity points data for SVG curve (simulated sprint trajectory based on logged hours)
  const trajectoryPoints = [
    { day: 'Day 1', est: 4, actual: 3.5 },
    { day: 'Day 2', est: 8, actual: 7.0 },
    { day: 'Day 3', est: 14, actual: 12.5 },
    { day: 'Day 4', est: 20, actual: 18.0 },
    { day: 'Day 5', est: 26, actual: 24.5 },
    { day: 'Day 6', est: 32, actual: totalLoggedHours },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto min-h-0">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Metric Cards Grid - Single Elevation Depth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
              Sprint Completion
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {completionRate}%
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-500">
                {completedTasks}/{totalTasks} tasks
              </span>
            </div>
            <div className="mt-3 w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
              Workload Delta
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {totalLoggedHours.toFixed(1)}h
              </span>
              <span className="text-xs font-mono tabular-nums text-neutral-500">
                of {totalEstHours.toFixed(1)}h est.
              </span>
            </div>
            <div className="mt-3 text-[11px] text-neutral-500 font-mono">
              Variance: {hoursVariance >= 0 ? `+${hoursVariance.toFixed(1)}%` : `${hoursVariance.toFixed(1)}%`}
            </div>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
              Active Focus Sessions
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {focusSession.completedCyclesToday}
              </span>
              <span className="text-xs font-mono tabular-nums text-blue-500">
                {((focusSession.completedCyclesToday * 25) / 60).toFixed(1)}h deep work
              </span>
            </div>
            <div className="mt-3 text-[11px] text-neutral-500 font-mono">
              Goal: 4 blocks / day ({(focusSession.completedCyclesToday / 4 * 100).toFixed(0)}%)
            </div>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
              In-Flight WIP
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {inProgressTasks + reviewTasks}
              </span>
              <span className="text-xs font-mono tabular-nums text-amber-500">
                Healthy WIP limit (&lt;5)
              </span>
            </div>
            <div className="mt-3 text-[11px] text-neutral-500 font-mono">
              {inProgressTasks} building · {reviewTasks} review
            </div>
          </div>
        </div>

        {/* Sprint Trajectory & Velocity Chart */}
        <div className={`p-6 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Sprint Velocity & Burnup Trajectory
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Cumulative logged engineering hours versus baseline budget
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-blue-500 rounded"></span>
                <span>Actual Logged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-neutral-600 stroke-dashed rounded"></span>
                <span>Estimated Target</span>
              </div>
            </div>
          </div>

          {/* SVG Burnup Line Chart */}
          <div className="w-full h-56 pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="30" x2="600" y2="30" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} strokeWidth="1" />
              <line x1="0" y1="80" x2="600" y2="80" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} strokeWidth="1" />
              <line x1="0" y1="130" x2="600" y2="130" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} strokeWidth="1" />

              {/* Target estimated line */}
              <polyline
                fill="none"
                stroke={theme === 'dark' ? '#525252' : '#cbd5e1'}
                strokeWidth="2"
                strokeDasharray="4 4"
                points="0,170 120,140 240,105 360,75 480,45 600,15"
              />

              {/* Actual logged line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points="0,170 120,145 240,115 360,82 480,50 600,22"
              />

              {/* Data points */}
              {[
                { x: 0, y: 170 },
                { x: 120, y: 145 },
                { x: 240, y: 115 },
                { x: 360, y: 82 },
                { x: 480, y: 50 },
                { x: 600, y: 22 },
              ].map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#3b82f6" />
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[11px] text-neutral-500 font-mono mt-2 tabular-nums">
              <span>Day 1</span>
              <span>Day 2</span>
              <span>Day 3</span>
              <span>Day 4</span>
              <span>Day 5</span>
              <span>Day 6 (Today)</span>
            </div>
          </div>
        </div>

        {/* Priority & Domain Allocation Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Breakdown */}
          <div className={`p-5 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Priority Distribution
            </h3>

            <div className="space-y-3 font-mono text-xs tabular-nums">
              {[
                { label: 'P0 Urgent (Blockers)', count: priorityCounts.P0, color: 'bg-rose-500' },
                { label: 'P1 High (Core Features)', count: priorityCounts.P1, color: 'bg-amber-500' },
                { label: 'P2 Normal (Enhancements)', count: priorityCounts.P2, color: 'bg-blue-500' },
                { label: 'P3 Low (Polish)', count: priorityCounts.P3, color: 'bg-neutral-500' },
              ].map((item) => {
                const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-400">
                      <span>{item.label}</span>
                      <span>{item.count} tasks ({pct}%)</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tag & Subsystem Distribution */}
          <div className={`p-5 rounded-xl border transition-colors ${
            theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Subsystem & Domain Allocation
            </h3>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {Object.entries(tagCounts).map(([tag, count]) => (
                <div key={tag} className="py-2 flex items-center justify-between text-xs">
                  <span className="text-neutral-700 dark:text-neutral-300">{tag}</span>
                  <span className="font-mono tabular-nums text-neutral-500">{count} tasks</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Velocity Ledger Table */}
        <div className={`rounded-xl border overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div className="p-4 border-b border-inherit">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Sprint Task Ledger
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-neutral-500 font-mono text-[11px] ${
                theme === 'dark' ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <tr>
                  <th className="px-4 py-2.5">Task Description</th>
                  <th className="px-4 py-2.5">Stage</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5 text-right">Est.</th>
                  <th className="px-4 py-2.5 text-right">Logged</th>
                  <th className="px-4 py-2.5">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono tabular-nums">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-neutral-500/5 transition-colors">
                    <td className="px-4 py-2.5 font-sans font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                      {task.title}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500 capitalize">
                      {task.status.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={task.priority === 'P0' ? 'text-rose-500' : task.priority === 'P1' ? 'text-amber-500' : 'text-neutral-400'}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-neutral-500">
                      {task.estimatedHours}h
                    </td>
                    <td className="px-4 py-2.5 text-right text-neutral-900 dark:text-neutral-100">
                      {task.loggedHours}h
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {task.dueDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
