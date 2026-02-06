import { create } from 'zustand';
import { ref, set as dbSet, get as dbGet, onValue, update } from 'firebase/database';
import type { Project } from '../types';
import { DEFAULT_ISSUE_STATUSES, DEFAULT_ISSUE_TYPES } from '../types';
import { db } from '../config/firebase';
import { generateId } from '../utils/markdown';
import { generateInviteCode } from '../utils/inviteCode';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  subscribeToProjects: (userId: string) => void;
  addProject: (name: string, ownerId: string, description?: string) => Promise<string>;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'issueStatuses' | 'issueTypes'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  incrementIssueCounter: (projectId: string) => Promise<number>;
  joinProjectByCode: (code: string, userId: string) => Promise<string>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;
  regenerateInviteCode: (projectId: string) => Promise<string>;
}

function generateProjectKey(name: string): string {
  const ascii = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  if (ascii.length > 0) return ascii;
  return 'PROJ';
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: true,
  error: null,
  unsubscribe: null,

  subscribeToProjects: (userId: string) => {
    // 既存のリスナーを解除
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    set({ loading: true, error: null });

    const projectsRef = ref(db, 'projects');
    const unsubscribe = onValue(
      projectsRef,
      (snapshot) => {
        const projects: Project[] = [];
        snapshot.forEach((child) => {
          const project = child.val() as Project;
          // ユーザーがオーナーまたはメンバーのプロジェクトのみ
          if (project.ownerId === userId || project.memberIds?.includes(userId)) {
            projects.push({ ...project, id: child.key! });
          }
        });
        set({ projects, loading: false });
      },
      (error) => {
        set({ error: error.message, loading: false });
      }
    );

    set({ unsubscribe });
  },

  addProject: async (name, ownerId, description) => {
    const id = generateId();
    const project: Project = {
      id,
      name,
      description: description || null,
      groupId: null,
      ownerId,
      memberIds: [ownerId],
      inviteCode: generateInviteCode(),
      issueStatuses: DEFAULT_ISSUE_STATUSES,
      issueTypes: DEFAULT_ISSUE_TYPES,
      issueCounter: 0,
      projectKey: generateProjectKey(name),
      createdAt: Date.now(),
    };

    await dbSet(ref(db, `projects/${id}`), project);
    return id;
  },

  updateProject: async (id, updates) => {
    const projectRef = ref(db, `projects/${id}`);
    await update(projectRef, updates);
  },

  deleteProject: async (id) => {
    await dbSet(ref(db, `projects/${id}`), null);
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id);
  },

  incrementIssueCounter: async (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return 0;

    const newCounter = (project.issueCounter ?? 0) + 1;
    await update(ref(db, `projects/${projectId}`), { issueCounter: newCounter });
    return newCounter;
  },

  joinProjectByCode: async (code: string, userId: string) => {
    const projectsRef = ref(db, 'projects');
    const snapshot = await dbGet(projectsRef);

    let foundProject: Project | null = null;
    let foundId: string | null = null;

    snapshot.forEach((child) => {
      const project = child.val() as Project;
      if (project.inviteCode === code) {
        foundProject = project;
        foundId = child.key;
      }
    });

    if (!foundProject || !foundId) {
      throw new Error('無効な招待コードです');
    }

    const project = foundProject as Project;
    const projectId = foundId;

    if (project.memberIds?.includes(userId)) {
      throw new Error('既にこのプロジェクトのメンバーです');
    }

    const newMemberIds = [...(project.memberIds || []), userId];
    await update(ref(db, `projects/${projectId}`), { memberIds: newMemberIds });

    return projectId;
  },

  removeMember: async (projectId: string, memberId: string) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) throw new Error('プロジェクトが見つかりません');

    if (project.ownerId === memberId) {
      throw new Error('オーナーは削除できません');
    }

    const newMemberIds = project.memberIds.filter((id) => id !== memberId);
    await update(ref(db, `projects/${projectId}`), { memberIds: newMemberIds });
  },

  regenerateInviteCode: async (projectId: string) => {
    const newCode = generateInviteCode();
    await update(ref(db, `projects/${projectId}`), { inviteCode: newCode });
    return newCode;
  },
}));
