export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'completed';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  assignee: {
    name: string;
    avatarUrl?: string;
  };
  estimatedHours: number;
  loggedHours: number;
  dueDate: string;
  checklist: ChecklistItem[];
  createdAt: string;
}

export type CanvasNodeType = 'sticky' | 'card' | 'process' | 'decision';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  tag?: string;
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
  author: string;
}

export type AmbientSoundType = 'none' | 'rain' | 'binaural' | 'waves' | 'brown';

export interface FocusSession {
  mode: 'focus' | 'short_break' | 'long_break';
  durationMinutes: number;
  remainingSeconds: number;
  isActive: boolean;
  linkedTaskId?: string;
  soundType: AmbientSoundType;
  soundVolume: number;
  completedCyclesToday: number;
}

export type ActiveView = 'board' | 'canvas' | 'docs' | 'focus' | 'metrics';
