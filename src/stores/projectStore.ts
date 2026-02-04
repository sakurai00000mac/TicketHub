import { create } from 'zustand';
import type { Project } from '../types';
import { DEFAULT_ISSUE_STATUSES, DEFAULT_ISSUE_TYPES } from '../types';
import { loadProjects, saveProjects } from '../utils/storage';
import { generateId } from '../utils/markdown';

interface ProjectState {
  projects: Project[];
  addProject: (name: string, description?: string) => string;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'issueStatuses' | 'issueTypes'>>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  incrementIssueCounter: (projectId: string) => number;
}

function generateProjectKey(name: string): string {
  const ascii = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  if (ascii.length > 0) return ascii;
  return 'PROJ';
}

// 旧形式のプロジェクトを新形式にマイグレーション
function migrateProjects(projects: Project[]): Project[] {
  let needsSave = false;
  const migrated = projects.map((p) => {
    if (!p.issueStatuses || !p.issueTypes || p.projectKey === undefined) {
      needsSave = true;
      return {
        ...p,
        groupId: p.groupId ?? null,
        issueStatuses: p.issueStatuses ?? DEFAULT_ISSUE_STATUSES,
        issueTypes: p.issueTypes ?? DEFAULT_ISSUE_TYPES,
        issueCounter: p.issueCounter ?? 0,
        projectKey: p.projectKey ?? generateProjectKey(p.name),
      };
    }
    return p;
  });
  if (needsSave) saveProjects(migrated);
  return migrated;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: migrateProjects(loadProjects()),

  addProject: (name, description) => {
    const id = generateId();
    const project: Project = {
      id,
      name,
      description,
      groupId: null,
      issueStatuses: DEFAULT_ISSUE_STATUSES,
      issueTypes: DEFAULT_ISSUE_TYPES,
      issueCounter: 0,
      projectKey: generateProjectKey(name),
      createdAt: Date.now(),
    };
    set((state) => {
      const projects = [...state.projects, project];
      saveProjects(projects);
      return { projects };
    });
    return id;
  },

  updateProject: (id, updates) => {
    set((state) => {
      const projects = state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      saveProjects(projects);
      return { projects };
    });
  },

  deleteProject: (id) => {
    set((state) => {
      const projects = state.projects.filter((p) => p.id !== id);
      saveProjects(projects);
      return { projects };
    });
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id);
  },

  incrementIssueCounter: (projectId) => {
    let counter = 0;
    set((state) => {
      const projects = state.projects.map((p) => {
        if (p.id === projectId) {
          counter = (p.issueCounter ?? 0) + 1;
          return { ...p, issueCounter: counter };
        }
        return p;
      });
      saveProjects(projects);
      return { projects };
    });
    return counter;
  },
}));
