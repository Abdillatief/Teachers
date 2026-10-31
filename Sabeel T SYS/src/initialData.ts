import { Task, CanvasNode, CanvasConnection, Note, WorkspaceData } from './types';

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Finalize design tokens and typography hierarchy',
    description: 'Ensure contrast compliance across dark and light canvases, verify tabular numeral vertical alignment in data tables.',
    status: 'done',
    priority: 'high',
    dueDate: '2026-09-24',
    tags: ['Design', 'Tokens'],
    subtasks: [
      { id: 'sub-1', text: 'Document color variables', completed: true },
      { id: 'sub-2', text: 'Validate WCAG AA 4.5:1 ratios', completed: true },
      { id: 'sub-3', text: 'Check monospace tabular font alignment', completed: true }
    ],
    createdAt: '2026-09-20'
  },
  {
    id: 'task-2',
    title: 'Implement procedural Web Audio focus soundscapes',
    description: 'Synthesize pink rain noise, alpha wave binaural pulsations, and gentle ocean modulations without external sound files.',
    status: 'in_progress',
    priority: 'urgent',
    dueDate: '2026-09-27',
    tags: ['Audio', 'Productivity'],
    subtasks: [
      { id: 'sub-4', text: 'Biquad filter pink noise curve', completed: true },
      { id: 'sub-5', text: 'Stereo panner for 10Hz binaural beat', completed: true },
      { id: 'sub-6', text: 'Chime generator on timer completion', completed: false }
    ],
    createdAt: '2026-09-22'
  },
  {
    id: 'task-3',
    title: 'Canvas node drag & Bezier connection renderer',
    description: 'Provide smooth SVG vector bezier curves between idea nodes with automatic connector dock calculations and label annotations.',
    status: 'in_progress',
    priority: 'medium',
    dueDate: '2026-09-28',
    tags: ['Canvas', 'Interaction'],
    subtasks: [
      { id: 'sub-7', text: 'Coordinate transformation math on zoom', completed: true },
      { id: 'sub-8', text: 'Click-to-connect line handles', completed: true },
      { id: 'sub-9', text: 'SVG arrowhead marker orientation', completed: true }
    ],
    createdAt: '2026-09-23'
  },
  {
    id: 'task-4',
    title: 'Markdown documentation real-time split view',
    description: 'Support instant keyboard shortcuts (Cmd+B, Cmd+I), table syntax, code blocks, and markdown file download.',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-09-30',
    tags: ['Editor', 'Docs'],
    subtasks: [
      { id: 'sub-10', text: 'Markdown syntax parser & sanitize', completed: false },
      { id: 'sub-11', text: 'Word count & reading time calculation', completed: false }
    ],
    createdAt: '2026-09-25'
  },
  {
    id: 'task-5',
    title: 'Local storage state backup & JSON import/export',
    description: 'Enable users to export their entire project board, notes, and node graphs into a clean JSON file and restore anytime.',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-10-02',
    tags: ['Storage', 'Security'],
    subtasks: [
      { id: 'sub-12', text: 'JSON serialization schema check', completed: false },
      { id: 'sub-13', text: 'File drag-and-drop import validation', completed: false }
    ],
    createdAt: '2026-09-25'
  },
  {
    id: 'task-6',
    title: 'Evaluate cloud sync options & multi-device handoff',
    description: 'Research local-first CRDT vs centralized Postgres sync for future multi-user collaborative workspace iterations.',
    status: 'backlog',
    priority: 'low',
    dueDate: '2026-10-15',
    tags: ['Architecture'],
    subtasks: [],
    createdAt: '2026-09-26'
  }
];

export const INITIAL_NODES: CanvasNode[] = [
  {
    id: 'node-1',
    title: 'Product Vision',
    description: 'High-focus, zero-clutter execution engine for thinkers and builders.',
    type: 'goal',
    x: 120,
    y: 180,
    color: '#0284c7' // sky-600
  },
  {
    id: 'node-2',
    title: 'Visual Flow Canvas',
    description: 'Freeform connected thought graphing with fast keyboard shortcuts.',
    type: 'idea',
    x: 420,
    y: 100,
    color: '#059669' // emerald-600
  },
  {
    id: 'node-3',
    title: 'Kanban Board',
    description: 'Strict status columns with subtask checklist progress.',
    type: 'action',
    x: 420,
    y: 280,
    color: '#d97706' // amber-600
  },
  {
    id: 'node-4',
    title: 'Offline-First Storage',
    description: 'All state saved synchronously in browser localStorage.',
    type: 'decision',
    x: 740,
    y: 190,
    color: '#4f46e5' // indigo-600
  },
  {
    id: 'node-5',
    title: 'Latency Budget Risk',
    description: 'Ensure canvas renders 60fps even with 50+ nodes and bezier paths.',
    type: 'risk',
    x: 740,
    y: 350,
    color: '#e11d48' // rose-600
  }
];

export const INITIAL_CONNECTIONS: CanvasConnection[] = [
  { id: 'conn-1', fromId: 'node-1', toId: 'node-2', label: 'Inspires' },
  { id: 'conn-2', fromId: 'node-1', toId: 'node-3', label: 'Structures' },
  { id: 'conn-3', fromId: 'node-2', toId: 'node-4', label: 'Persists' },
  { id: 'conn-4', fromId: 'node-3', toId: 'node-4', label: 'Syncs' },
  { id: 'conn-5', fromId: 'node-2', toId: 'node-5', label: 'Monitors' }
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Klaro Architectural Principles',
    category: 'Architecture',
    pinned: true,
    updatedAt: '2026-09-26 09:15',
    tags: ['Manifesto', 'Architecture'],
    content: `# Klaro Architectural Principles

## 1. Zero-Friction Execution
Software should never force the creator into administrative overhead. Every action — creating a task, jotting a thought, or connecting a node — must complete in under 200 milliseconds.

## 2. Spatial Thinking & Linearity
Linear task lists are essential for execution; freeform spatial canvases are essential for discovery. Klaro links both modes seamlessly:
- **Board Mode**: Linear accountability and deadline tracking.
- **Canvas Mode**: Non-linear synthesis and relationship mapping.
- **Notes Mode**: Deep prose and long-form strategic documentation.

## 3. Hermetic Focus Environment
Background ambient synthesis is powered natively by the Web Audio API. No external stream interruptions, tracking scripts, or ad networks.`
  },
  {
    id: 'note-2',
    title: 'Sprint 14: Release Scope & Milestones',
    category: 'Sprints',
    pinned: false,
    updatedAt: '2026-09-25 16:30',
    tags: ['Planning', 'Sprint'],
    content: `# Sprint 14: Core Engine Delivery

### Focus Objectives
1. **Interactive Node Canvas**: Draggable nodes, bezier line connections, instant connection deletion.
2. **Audio Atmosphere Engine**: White noise, rain frequency filtering, 10Hz alpha binaural beats.
3. **Structured Export**: Full JSON export and Markdown file generator.

### Checkpoints
- [x] Baseline UI wireframe completed
- [x] State persistence schema validated
- [ ] Sound synthesis modulation calibrated
- [ ] Cross-browser audio context testing`
  }
];

export const INITIAL_WORKSPACE: WorkspaceData = {
  tasks: INITIAL_TASKS,
  nodes: INITIAL_NODES,
  connections: INITIAL_CONNECTIONS,
  notes: INITIAL_NOTES,
  focusSessions: 14,
  totalFocusMinutes: 350
};
