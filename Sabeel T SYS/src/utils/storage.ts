import { Task, CanvasNode, CanvasConnection, DrawingPath, DocumentItem, FocusSession } from '../types';

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'WebGL Render Pipeline: Instanced buffer geometry optimization',
    description: 'Transition from single-mesh draw calls to multi-instance batching to achieve stable 120 FPS on heavy viewport scenes.',
    status: 'in_progress',
    priority: 'P0',
    tags: ['Core', 'Graphics', 'Performance'],
    assignee: { name: 'Elena Vance' },
    estimatedHours: 8,
    loggedHours: 5.5,
    dueDate: '2026-10-02',
    checklist: [
      { id: 'c1', text: 'Benchmark baseline draw call overhead', completed: true },
      { id: 'c2', text: 'Build instance matrix packing shader', completed: true },
      { id: 'c3', text: 'Profile memory delta across 10k entities', completed: false },
    ],
    createdAt: '2026-09-24',
  },
  {
    id: 'task-2',
    title: 'Design System: WCAG AA contrast ratio & tactile focus rings',
    description: 'Audit keyboard tab stops, outline-offset compliance, and high-contrast dark mode luminance delta.',
    status: 'in_progress',
    priority: 'P1',
    tags: ['Design', 'Accessibility'],
    assignee: { name: 'Marcus Chen' },
    estimatedHours: 6,
    loggedHours: 3.0,
    dueDate: '2026-09-29',
    checklist: [
      { id: 'c4', text: 'Verify 4.5:1 ratio on muted foreground labels', completed: true },
      { id: 'c5', text: 'Add global focus-visible styling', completed: true },
      { id: 'c6', text: 'Test screen reader landmarks in navigation', completed: false },
    ],
    createdAt: '2026-09-25',
  },
  {
    id: 'task-3',
    title: 'Offline Sync: Conflict-free vector clock resolution',
    description: 'Implement client-side LWW (last-write-wins) with logical timestamps for spatial canvas modifications.',
    status: 'backlog',
    priority: 'P1',
    tags: ['Architecture', 'Realtime'],
    assignee: { name: 'Elena Vance' },
    estimatedHours: 12,
    loggedHours: 0,
    dueDate: '2026-10-08',
    checklist: [
      { id: 'c7', text: 'Define node update delta packet structure', completed: false },
      { id: 'c8', text: 'Simulate concurrent drag operations', completed: false },
    ],
    createdAt: '2026-09-26',
  },
  {
    id: 'task-4',
    title: 'Telemetry & Profiling: Micro-interaction latency budget check',
    description: 'Ensure all UI hover feedback and button presses resolve within 150ms without compositor layout thrashing.',
    status: 'review',
    priority: 'P2',
    tags: ['Quality', 'Frontend'],
    assignee: { name: 'Sophia Ray' },
    estimatedHours: 4,
    loggedHours: 4.2,
    dueDate: '2026-09-27',
    checklist: [
      { id: 'c9', text: 'Chrome DevTools trace analysis on canvas pan', completed: true },
      { id: 'c10', text: 'Audit paint bounds during modal transitions', completed: true },
    ],
    createdAt: '2026-09-23',
  },
  {
    id: 'task-5',
    title: 'Soundscape Engine: Resonant filter sweep with low-pass LFO',
    description: 'Synthesize ocean and rain natural frequency contours directly in Web Audio without external assets.',
    status: 'completed',
    priority: 'P1',
    tags: ['Audio', 'Flow'],
    assignee: { name: 'Sophia Ray' },
    estimatedHours: 5,
    loggedHours: 5.0,
    dueDate: '2026-09-25',
    checklist: [
      { id: 'c11', text: 'Create dual oscillator binaural generator', completed: true },
      { id: 'c12', text: 'Add master gain ramping to prevent pops', completed: true },
    ],
    createdAt: '2026-09-22',
  },
  {
    id: 'task-6',
    title: 'Zero-Pill Typography: Replace badged chips with editorial text',
    description: 'Eliminate nested colored badge pills across task lists and breadcrumbs. Adopt unboxed text with subtle typographic separators.',
    status: 'completed',
    priority: 'P2',
    tags: ['Design', 'Refactor'],
    assignee: { name: 'Marcus Chen' },
    estimatedHours: 3,
    loggedHours: 3.0,
    dueDate: '2026-09-24',
    checklist: [
      { id: 'c13', text: 'Update card metadata renderers', completed: true },
      { id: 'c14', text: 'Verify mobile touch target margins', completed: true },
    ],
    createdAt: '2026-09-21',
  },
];

const INITIAL_NODES: CanvasNode[] = [
  {
    id: 'node-arch-1',
    type: 'card',
    x: 80,
    y: 120,
    width: 240,
    height: 140,
    title: 'Client Spatial Engine',
    content: 'React 19 + SVG Bezier Graph. Supports 1000+ nodes with 60 FPS viewport transform rendering.',
    color: '#3b82f6',
    tag: 'Frontend Layer',
  },
  {
    id: 'node-arch-2',
    type: 'card',
    x: 400,
    y: 120,
    width: 240,
    height: 140,
    title: 'Audio Synthesizer',
    content: 'Web Audio API Native Graph. Dual 216Hz/226Hz binaural generator and LFO waves.',
    color: '#10b981',
    tag: 'Acoustic Core',
  },
  {
    id: 'node-arch-3',
    type: 'card',
    x: 720,
    y: 120,
    width: 240,
    height: 140,
    title: 'State & Persistence',
    content: 'Local-first snapshotting with versioned JSON import/export and zero-latency local retrieval.',
    color: '#8b5cf6',
    tag: 'Storage',
  },
  {
    id: 'node-sticky-1',
    type: 'sticky',
    x: 80,
    y: 330,
    width: 200,
    height: 160,
    title: 'Design Principle',
    content: 'Zero pill clutter! Never wrap static metadata in colored capsule pills. Use clean unboxed text separated by dots.',
    color: '#f59e0b',
  },
  {
    id: 'node-sticky-2',
    type: 'sticky',
    x: 340,
    y: 330,
    width: 200,
    height: 160,
    title: 'Latency Budget',
    content: 'Every click, hover, and pan interaction must settle under 150ms. Use CSS transform only.',
    color: '#ec4899',
  },
  {
    id: 'node-decision-1',
    type: 'decision',
    x: 620,
    y: 340,
    width: 190,
    height: 140,
    title: 'Conflict Resolution',
    content: 'Should local changes overwrite incoming delta? Default to timestamp with user review prompt.',
    color: '#06b6d4',
  },
];

const INITIAL_CONNECTIONS: CanvasConnection[] = [
  {
    id: 'conn-1',
    fromNodeId: 'node-arch-1',
    toNodeId: 'node-arch-2',
    label: 'State Hook',
  },
  {
    id: 'conn-2',
    fromNodeId: 'node-arch-2',
    toNodeId: 'node-arch-3',
    label: 'Cache Sync',
  },
  {
    id: 'conn-3',
    fromNodeId: 'node-sticky-1',
    toNodeId: 'node-arch-1',
    label: 'Spec Guard',
  },
];

const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 'doc-arch-spec',
    title: 'RFC-102: Stratos Architecture & Runtime Specifications',
    category: 'Architecture',
    author: 'Elena Vance, Design Lead',
    updatedAt: '2026-09-26',
    content: `# RFC-102: Stratos Architecture & Runtime Specifications

## 1. Executive Summary
Stratos Studio is engineered as an ultra-responsive, zero-latency desktop creative workspace. It unifies high-precision agile sprint planning, 2D infinite spatial canvas graph manipulation, live Markdown document authoring, and a native Web Audio deep-work flow deck.

## 2. Core Constraints & Guarantees
- **Local-First Reliability**: Zero network round-trip dependencies for core workflows.
- **Acoustic Synthesis**: Built entirely upon the Web Audio API (\`AudioContext\`, \`BiquadFilterNode\`, \`OscillatorNode\`) ensuring zero broken remote audio URLs or CDN outages.
- **Zero-Pill Typography Discipline**: Adherence to the anti-slop frontend constitution. Metadata items are rendered as clean, unboxed text paired with subtle typographical separator dots (\`·\`).
- **Tabular Alignment**: Every duration, numeric metric, and timestamp leverages monospace tabular figures (\`tabular-nums\`).

## 3. Spatial Canvas Engine
The canvas implements a decoupled coordinate transformation layer:
\`\`\`typescript
const screenX = (worldX + pan.x) * zoom;
const screenY = (worldY + pan.y) * zoom;
\`\`\`
Bezierz connector paths compute control offsets dynamically based on the relative position of connected anchor nodes.

## 4. Sprint & Velocity Model
Sprint velocity is tracked through completed estimated hours versus logged hours across discrete review intervals.
`,
  },
  {
    id: 'doc-design-tokens',
    title: 'Design System: Tokens, Radii & Interaction Latency',
    category: 'Design Systems',
    author: 'Marcus Chen',
    updatedAt: '2026-09-25',
    content: `# Design System: Tokens & Tactile Philosophy

## 1. Color System (60-30-10 Rule)
- **Canvas Neutral (60%)**: Dark Slate \`#0a0d14\` / Off-White \`#fafafa\`
- **Structural Surfaces (30%)**: Hairline borders \`rgba(255, 255, 255, 0.08)\` and cards \`#121622\`
- **Accent Budget (10%)**: Crisp Cobalt \`#3b82f6\` and Emerald \`#10b981\` reserved for active focus states and primary actions.

## 2. Radius Math
We enforce the nested curvature theorem:
\`\`\`
r_inner = r_outer - padding
\`\`\`
Card outer radius (\`12px\`) with \`12px\` inner padding pairs with \`6px\` inner controls to eliminate optical corner collisions.

## 3. Motion Curves
Micro-interactions must resolve within 150ms using smooth settling curves:
\`\`\`css
transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease;
\`\`\`
`,
  },
  {
    id: 'doc-retro-sprint',
    title: 'Sprint 24 Retrospective & Technical Learnings',
    category: 'Retrospectives',
    author: 'Sophia Ray',
    updatedAt: '2026-09-24',
    content: `# Sprint 24 Retrospective & Technical Learnings

### What Went Exceptionally Well
- Native Web Audio noise generation completely eliminated streaming latency and external dependency failures.
- Canvas connector bezier rendering reduced visual clutter by calculating smooth horizontal inflection curves.
- Full local-first backup export guarantees user work is never lost.

### Focus Areas for Next Sprint
1. Introduce multi-selection lasso on infinite canvas.
2. Add export of canvas snapshot to SVG vector graphics.
3. Track historical focus minutes in weekly telemetry charts.
`,
  },
];

const INITIAL_FOCUS: FocusSession = {
  mode: 'focus',
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  isActive: false,
  linkedTaskId: 'task-1',
  soundType: 'none',
  soundVolume: 0.6,
  completedCyclesToday: 3,
};

const STORAGE_KEYS = {
  TASKS: 'stratos_tasks_v1',
  NODES: 'stratos_canvas_nodes_v1',
  CONNECTIONS: 'stratos_canvas_connections_v1',
  DRAWINGS: 'stratos_drawings_v1',
  DOCS: 'stratos_docs_v1',
  FOCUS: 'stratos_focus_v1',
  THEME: 'stratos_theme_v1',
};

export const storage = {
  getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  },
  saveTasks(tasks: Task[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error(e);
    }
  },

  getNodes(): CanvasNode[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NODES);
      return data ? JSON.parse(data) : INITIAL_NODES;
    } catch {
      return INITIAL_NODES;
    }
  },
  saveNodes(nodes: CanvasNode[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodes));
    } catch (e) {
      console.error(e);
    }
  },

  getConnections(): CanvasConnection[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
      return data ? JSON.parse(data) : INITIAL_CONNECTIONS;
    } catch {
      return INITIAL_CONNECTIONS;
    }
  },
  saveConnections(conns: CanvasConnection[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(conns));
    } catch (e) {
      console.error(e);
    }
  },

  getDrawings(): DrawingPath[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DRAWINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveDrawings(drawings: DrawingPath[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAWINGS, JSON.stringify(drawings));
    } catch (e) {
      console.error(e);
    }
  },

  getDocs(): DocumentItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOCS);
      return data ? JSON.parse(data) : INITIAL_DOCS;
    } catch {
      return INITIAL_DOCS;
    }
  },
  saveDocs(docs: DocumentItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(docs));
    } catch (e) {
      console.error(e);
    }
  },

  getFocus(): FocusSession {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOCUS);
      return data ? JSON.parse(data) : INITIAL_FOCUS;
    } catch {
      return INITIAL_FOCUS;
    }
  },
  saveFocus(focus: FocusSession) {
    try {
      localStorage.setItem(STORAGE_KEYS.FOCUS, JSON.stringify(focus));
    } catch (e) {
      console.error(e);
    }
  },

  getTheme(): 'dark' | 'light' {
    try {
      return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  },
  saveTheme(theme: 'dark' | 'light') {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.error(e);
    }
  },

  exportAllData() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      nodes: this.getNodes(),
      connections: this.getConnections(),
      drawings: this.getDrawings(),
      docs: this.getDocs(),
      focus: this.getFocus(),
    };
  },

  importAllData(jsonString: string) {
    const data = JSON.parse(jsonString);
    if (data.tasks) this.saveTasks(data.tasks);
    if (data.nodes) this.saveNodes(data.nodes);
    if (data.connections) this.saveConnections(data.connections);
    if (data.drawings) this.saveDrawings(data.drawings);
    if (data.docs) this.saveDocs(data.docs);
    if (data.focus) this.saveFocus(data.focus);
    return true;
  },

  resetToDefault() {
    this.saveTasks(INITIAL_TASKS);
    this.saveNodes(INITIAL_NODES);
    this.saveConnections(INITIAL_CONNECTIONS);
    this.saveDrawings([]);
    this.saveDocs(INITIAL_DOCS);
    this.saveFocus(INITIAL_FOCUS);
  }
};
