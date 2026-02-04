import { create } from 'zustand';
import type { Issue, IssueComment, IssueHistory } from '../types';
import { loadIssues, saveIssues, loadIssueComments, saveIssueComments, loadIssueHistory, saveIssueHistory } from '../utils/storage';
import { generateId } from '../utils/markdown';

interface IssueState {
  issues: Issue[];
  comments: IssueComment[];
  history: IssueHistory[];

  // Issue CRUD
  addIssue: (issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  deleteProjectIssues: (projectId: string) => void;

  // Comment CRUD
  addComment: (issueId: string, content: string, authorId: string) => string;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;

  // Queries
  getProjectIssues: (projectId: string) => Issue[];
  getIssuesByStatus: (projectId: string, statusId: string) => Issue[];
  getChildIssues: (parentId: string) => Issue[];
  getIssueComments: (issueId: string) => IssueComment[];
  getIssueHistory: (issueId: string) => IssueHistory[];
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: loadIssues(),
  comments: loadIssueComments(),
  history: loadIssueHistory(),

  addIssue: (issueData) => {
    const id = generateId();
    const issue: Issue = {
      ...issueData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => {
      const issues = [...state.issues, issue];
      saveIssues(issues);
      return { issues };
    });
    return id;
  },

  updateIssue: (id, updates) => {
    set((state) => {
      const oldIssue = state.issues.find((i) => i.id === id);
      if (!oldIssue) return state;

      const newHistory: IssueHistory[] = [];
      const now = Date.now();
      const changedBy = 'current-user'; // TODO: 実際のユーザーIDに置き換え

      // フィールドごとの変更を記録
      const trackField = (field: keyof Issue, displayName: string, formatter?: (val: any) => string) => {
        if (updates[field] !== undefined && updates[field] !== oldIssue[field]) {
          const format = formatter || ((v: any) => v?.toString() ?? '');
          newHistory.push({
            id: generateId(),
            issueId: id,
            field: displayName,
            oldValue: format(oldIssue[field]),
            newValue: format(updates[field]),
            changedBy,
            createdAt: now,
          });
        }
      };

      trackField('title', '件名');
      trackField('description', '詳細');
      trackField('typeId', '種別');
      trackField('statusId', 'ステータス');
      trackField('priority', '優先度');
      trackField('assigneeId', '担当者');
      trackField('parentId', '親課題');
      trackField('startDate', '開始日', (v) => v ? new Date(v).toLocaleDateString('ja-JP') : '未設定');
      trackField('dueDate', '期限', (v) => v ? new Date(v).toLocaleDateString('ja-JP') : '未設定');

      const issues = state.issues.map((i) =>
        i.id === id ? { ...i, ...updates, updatedAt: now } : i
      );
      const history = [...state.history, ...newHistory];

      saveIssues(issues);
      saveIssueHistory(history);

      return { issues, history };
    });
  },

  deleteIssue: (id) => {
    // 子課題も再帰的に削除
    const deleteRecursive = (issueId: string, allIssues: Issue[]): Issue[] => {
      const children = allIssues.filter((i) => i.parentId === issueId);
      let remaining = allIssues.filter((i) => i.id !== issueId);
      for (const child of children) {
        remaining = deleteRecursive(child.id, remaining);
      }
      return remaining;
    };

    set((state) => {
      const issues = deleteRecursive(id, state.issues);
      const comments = state.comments.filter((c) => c.issueId !== id);
      const history = state.history.filter((h) => h.issueId !== id);
      saveIssues(issues);
      saveIssueComments(comments);
      saveIssueHistory(history);
      return { issues, comments, history };
    });
  },

  deleteProjectIssues: (projectId) => {
    set((state) => {
      const projectIssueIds = new Set(
        state.issues.filter((i) => i.projectId === projectId).map((i) => i.id)
      );
      const issues = state.issues.filter((i) => i.projectId !== projectId);
      const comments = state.comments.filter((c) => !projectIssueIds.has(c.issueId));
      const history = state.history.filter((h) => !projectIssueIds.has(h.issueId));
      saveIssues(issues);
      saveIssueComments(comments);
      saveIssueHistory(history);
      return { issues, comments, history };
    });
  },

  addComment: (issueId, content, authorId) => {
    const id = generateId();
    const comment: IssueComment = {
      id,
      issueId,
      content,
      authorId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => {
      const comments = [...state.comments, comment];
      saveIssueComments(comments);
      return { comments };
    });
    return id;
  },

  updateComment: (id, content) => {
    set((state) => {
      const comments = state.comments.map((c) =>
        c.id === id ? { ...c, content, updatedAt: Date.now() } : c
      );
      saveIssueComments(comments);
      return { comments };
    });
  },

  deleteComment: (id) => {
    set((state) => {
      const comments = state.comments.filter((c) => c.id !== id);
      saveIssueComments(comments);
      return { comments };
    });
  },

  getProjectIssues: (projectId) => {
    return get().issues.filter((i) => i.projectId === projectId);
  },

  getIssuesByStatus: (projectId, statusId) => {
    return get()
      .issues.filter((i) => i.projectId === projectId && i.statusId === statusId)
      .sort((a, b) => a.order - b.order);
  },

  getChildIssues: (parentId) => {
    return get().issues.filter((i) => i.parentId === parentId);
  },

  getIssueComments: (issueId) => {
    return get()
      .comments.filter((c) => c.issueId === issueId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  getIssueHistory: (issueId) => {
    return get()
      .history.filter((h) => h.issueId === issueId)
      .sort((a, b) => b.createdAt - a.createdAt); // 新しい順
  },
}));
