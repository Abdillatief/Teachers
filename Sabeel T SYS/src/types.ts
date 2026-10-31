export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  tags: string[];
  subtasks: Subtask[];
  createdAt: string;
  assignee?: string;
}

export type NodeType = 'idea' | 'goal' | 'action' | 'risk' | 'decision';

export interface CanvasNode {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  x: number;
  y: number;
  color: string;
}

export interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  updatedAt: string;
  tags: string[];
}

export type ViewMode = 'board' | 'canvas' | 'notes' | 'focus' | 'analytics';

export interface WorkspaceData {
  tasks: Task[];
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  notes: Note[];
  focusSessions: number;
  totalFocusMinutes: number;
}
