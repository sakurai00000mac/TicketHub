import { create } from 'zustand';
import { ref, set as dbSet, onValue, update, remove } from 'firebase/database';
import type { Issue, IssueComment, IssueHistory } from '../types';
import { db } from '../config/firebase';
import { generateId } from '../utils/markdown';

interface IssueState {
  issues: Issue[];
  comments: IssueComment[];
  history: IssueHistory[];
  subscriptions: Map<string, () => void>;

  // Subscriptions
  subscribeToProject: (projectId: string) => void;
  unsubscribeFromProject: (projectId: string) => void;

  // Issue CRUD
  addIssue: (issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateIssue: (id: string, updates: Partial<Issue>, changedBy: string) => Promise<void>;
  deleteIssue: (id: string, projectId: string) => Promise<void>;
  deleteProjectIssues: (projectId: string) => void;

  // Comment CRUD
  addComment: (projectId: string, issueId: string, content: string, authorId: string) => Promise<string>;
  updateComment: (projectId: string, id: string, content: string) => Promise<void>;
  deleteComment: (projectId: string, id: string) => Promise<void>;

  // Queries
  getProjectIssues: (projectId: string) => Issue[];
  getIssuesByStatus: (projectId: string, statusId: string) => Issue[];
  getChildIssues: (parentId: string) => Issue[];
  getIssueComments: (issueId: string) => IssueComment[];
  getIssueHistory: (issueId: string) => IssueHistory[];
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: [],
  comments: [],
  history: [],
  subscriptions: new Map(),

  subscribeToProject: (projectId: string) => {
    const { subscriptions } = get();
    if (subscriptions.has(projectId)) return;

    const unsubscribers: (() => void)[] = [];

    // Issues
    const issuesRef = ref(db, `projects/${projectId}/issues`);
    const unsubIssues = onValue(issuesRef, (snapshot) => {
      const projectIssues: Issue[] = [];
      snapshot.forEach((child) => {
        projectIssues.push({ ...child.val(), id: child.key! });
      });
      set((state) => ({
        issues: [
          ...state.issues.filter((i) => i.projectId !== projectId),
          ...projectIssues,
        ],
      }));
    });
    unsubscribers.push(unsubIssues);

    // Comments
    const commentsRef = ref(db, `projects/${projectId}/comments`);
    const unsubComments = onValue(commentsRef, (snapshot) => {
      const projectComments: IssueComment[] = [];
      snapshot.forEach((child) => {
        projectComments.push({ ...child.val(), id: child.key! });
      });
      set((state) => {
        const projectIssueIds = new Set(
          state.issues.filter((i) => i.projectId === projectId).map((i) => i.id)
        );
        return {
          comments: [
            ...state.comments.filter((c) => !projectIssueIds.has(c.issueId)),
            ...projectComments,
          ],
        };
      });
    });
    unsubscribers.push(unsubComments);

    // History
    const historyRef = ref(db, `projects/${projectId}/history`);
    const unsubHistory = onValue(historyRef, (snapshot) => {
      const projectHistory: IssueHistory[] = [];
      snapshot.forEach((child) => {
        projectHistory.push({ ...child.val(), id: child.key! });
      });
      set((state) => {
        const projectIssueIds = new Set(
          state.issues.filter((i) => i.projectId === projectId).map((i) => i.id)
        );
        return {
          history: [
            ...state.history.filter((h) => !projectIssueIds.has(h.issueId)),
            ...projectHistory,
          ],
        };
      });
    });
    unsubscribers.push(unsubHistory);

    const unsubscribe = () => {
      unsubscribers.forEach((unsub) => unsub());
    };

    set((state) => ({
      subscriptions: new Map(state.subscriptions).set(projectId, unsubscribe),
    }));
  },

  unsubscribeFromProject: (projectId: string) => {
    const { subscriptions } = get();
    const unsubscribe = subscriptions.get(projectId);
    if (unsubscribe) {
      unsubscribe();
      set((state) => {
        const newSubs = new Map(state.subscriptions);
        newSubs.delete(projectId);
        return { subscriptions: newSubs };
      });
    }
  },

  addIssue: async (issueData) => {
    const id = generateId();
    const issue: Issue = {
      ...issueData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await dbSet(ref(db, `projects/${issueData.projectId}/issues/${id}`), issue);
    return id;
  },

  updateIssue: async (id, updates, changedBy) => {
    const issue = get().issues.find((i) => i.id === id);
    if (!issue) return;

    const now = Date.now();
    const historyEntries: IssueHistory[] = [];

    // Track changes
    const trackField = (field: keyof Issue, displayName: string, formatter?: (val: unknown) => string) => {
      if (updates[field] !== undefined && updates[field] !== issue[field]) {
        const format = formatter || ((v: unknown) => v?.toString() ?? '');
        historyEntries.push({
          id: generateId(),
          issueId: id,
          field: displayName,
          oldValue: format(issue[field]),
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
    trackField('startDate', '開始日', (v) => v ? new Date(v as number).toLocaleDateString('ja-JP') : '未設定');
    trackField('dueDate', '期限', (v) => v ? new Date(v as number).toLocaleDateString('ja-JP') : '未設定');

    // Update issue
    await update(ref(db, `projects/${issue.projectId}/issues/${id}`), {
      ...updates,
      updatedAt: now,
    });

    // Add history entries
    for (const entry of historyEntries) {
      await dbSet(ref(db, `projects/${issue.projectId}/history/${entry.id}`), entry);
    }
  },

  deleteIssue: async (id, projectId) => {
    const { issues, comments, history } = get();

    // Find all child issues recursively
    const findAllChildren = (parentId: string): string[] => {
      const children = issues.filter((i) => i.parentId === parentId);
      return children.flatMap((c) => [c.id, ...findAllChildren(c.id)]);
    };

    const idsToDelete = [id, ...findAllChildren(id)];

    // Delete issues
    for (const issueId of idsToDelete) {
      await remove(ref(db, `projects/${projectId}/issues/${issueId}`));
    }

    // Delete related comments
    const commentsToDelete = comments.filter((c) => idsToDelete.includes(c.issueId));
    for (const comment of commentsToDelete) {
      await remove(ref(db, `projects/${projectId}/comments/${comment.id}`));
    }

    // Delete related history
    const historyToDelete = history.filter((h) => idsToDelete.includes(h.issueId));
    for (const entry of historyToDelete) {
      await remove(ref(db, `projects/${projectId}/history/${entry.id}`));
    }
  },

  deleteProjectIssues: (projectId) => {
    // This will be handled by deleting the project itself
    // The realtime listener will automatically update the state
    set((state) => ({
      issues: state.issues.filter((i) => i.projectId !== projectId),
      comments: state.comments.filter((c) => {
        const issue = state.issues.find((i) => i.id === c.issueId);
        return issue?.projectId !== projectId;
      }),
      history: state.history.filter((h) => {
        const issue = state.issues.find((i) => i.id === h.issueId);
        return issue?.projectId !== projectId;
      }),
    }));
  },

  addComment: async (projectId, issueId, content, authorId) => {
    const id = generateId();
    const comment: IssueComment = {
      id,
      issueId,
      content,
      authorId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await dbSet(ref(db, `projects/${projectId}/comments/${id}`), comment);
    return id;
  },

  updateComment: async (projectId, id, content) => {
    await update(ref(db, `projects/${projectId}/comments/${id}`), {
      content,
      updatedAt: Date.now(),
    });
  },

  deleteComment: async (projectId, id) => {
    await remove(ref(db, `projects/${projectId}/comments/${id}`));
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
      .sort((a, b) => b.createdAt - a.createdAt);
  },
}));
