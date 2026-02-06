// ============================================
// ユーザー・グループ（Firebase移行まではローカル）
// ============================================

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
}

// ============================================
// プロジェクト
// ============================================

export interface IssueStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface IssueType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  groupId: string | null;
  ownerId: string;
  memberIds: string[];
  inviteCode: string;
  issueStatuses: IssueStatus[];
  issueTypes: IssueType[];
  issueCounter: number;
  projectKey: string;
  createdAt: number;
}

// ============================================
// 課題（Issue）
// ============================================

export type IssuePriority = 'high' | 'medium' | 'low';

export interface Issue {
  id: string;
  projectId: string;
  key: string;
  title: string;
  description: string;
  typeId: string;
  statusId: string;
  priority: IssuePriority;
  assigneeId: string | null;
  parentId: string | null;
  startDate: number | null;
  dueDate: number | null;
  order: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface IssueComment {
  id: string;
  issueId: string;
  content: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
}

export interface IssueHistory {
  id: string;
  issueId: string;
  field: string;           // 変更されたフィールド名
  oldValue: string | null; // 変更前の値
  newValue: string | null; // 変更後の値
  changedBy: string;
  createdAt: number;
}

// ============================================
// Wikiページ（既存）
// ============================================

export interface Page {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  content: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// ドキュメント
// ============================================

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  tags: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// デフォルト値
// ============================================

export const DEFAULT_ISSUE_STATUSES: IssueStatus[] = [
  { id: 'status-open', name: '未対応', color: '#6b7280', order: 0 },
  { id: 'status-in-progress', name: '処理中', color: '#2563eb', order: 1 },
  { id: 'status-resolved', name: '処理済み', color: '#eab308', order: 2 },
  { id: 'status-closed', name: '完了', color: '#16a34a', order: 3 },
];

export const DEFAULT_ISSUE_TYPES: IssueType[] = [
  { id: 'type-task', name: 'タスク', color: '#2563eb', icon: 'FiCheckSquare' },
  { id: 'type-bug', name: 'バグ', color: '#dc2626', icon: 'FiBug' },
  { id: 'type-feature', name: '要望', color: '#16a34a', icon: 'FiStar' },
  { id: 'type-other', name: 'その他', color: '#6b7280', icon: 'FiCircle' },
];
