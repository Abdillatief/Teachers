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

// Arabic Essay Grading & Orthography Types
export type ErrorCategory = 'spelling' | 'grammar' | 'punctuation' | 'structure' | 'style' | 'morphology' | 'other';

export interface CorrectionError {
  id: string;
  originalWord: string;
  correctedWord: string;
  ruleCategory?: string;
  type?: string;
  typeName?: string;
  explanation: string;
  sentenceContext?: string;
}

export interface RuleGroup {
  ruleName: string;
  count: number;
  errors: CorrectionError[];
  countedMistakes: number;
}

export interface LetterTemplateCheck {
  isLetter: boolean;
  hasSenderReceiverBox: boolean;
  hasIntroduction: boolean;
  hasConclusion: boolean;
  missingElements: string[];
  templateNotes?: string;
  isTemplateComplete?: boolean;
  deductionApplied?: boolean;
  deductionAmount?: number;
}

export interface GradingResult {
  rawTranscribedText: string;
  studentTextWithUnderlinedErrors?: string;
  correctedHtmlText: string;
  correctedPlainText: string;
  actualWordCount: number;
  targetWordCount?: number;
  wordCountScore?: number;
  lengthStatus?: string;
  lengthFeedback?: string;
  contentScore: number;
  contentFeedback: string;
  languageScore: number;
  baseLanguageScore?: number;
  templateDeduction?: number;
  languageScoreReason?: string;
  languageScoreBreakdown?: {
    baseScore: number;
    deduction: number;
    reason: string;
  };
  totalScore: number;
  ratingLabel: string;
  letterTemplate?: LetterTemplateCheck;
  errors: CorrectionError[];
  errorCount?: number;
  ruleGroups?: RuleGroup[];
  totalRawErrors?: number;
  calculatedMistakes?: number;
  transcriptionNotes?: string;
  doubleCheckVerified?: boolean;
  analyzedAt?: string;
}

