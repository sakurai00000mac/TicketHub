import { create } from 'zustand';
import type { Issue, IssueComment } from '../types';
import { loadIssues, saveIssues, loadIssueComments, saveIssueComments } from '../utils/storage';
import { generateId } from '../utils/markdown';

interface IssueState {
  issues: Issue[];
  comments: IssueComment[];

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
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: loadIssues(),
  comments: loadIssueComments(),

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
      const issues = state.issues.map((i) =>
        i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i
      );
      saveIssues(issues);
      return { issues };
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
      saveIssues(issues);
      saveIssueComments(comments);
      return { issues, comments };
    });
  },

  deleteProjectIssues: (projectId) => {
    set((state) => {
      const projectIssueIds = new Set(
        state.issues.filter((i) => i.projectId === projectId).map((i) => i.id)
      );
      const issues = state.issues.filter((i) => i.projectId !== projectId);
      const comments = state.comments.filter((c) => !projectIssueIds.has(c.issueId));
      saveIssues(issues);
      saveIssueComments(comments);
      return { issues, comments };
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
}));
