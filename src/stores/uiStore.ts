import { create } from 'zustand';
import type { ImportData } from '../utils/storage';
import {
  saveProjects, savePages, saveIssues, saveIssueComments, saveDocuments,
} from '../utils/storage';
import { useProjectStore } from './projectStore';
import { useWikiStore } from './wikiStore';
import { useIssueStore } from './issueStore';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // データインポート（全ストア横断）
  importAllData: (data: ImportData) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  importAllData: (data) => {
    saveProjects(data.projects);
    savePages(data.pages);
    saveIssues(data.issues ?? []);
    saveIssueComments(data.issueComments ?? []);
    saveDocuments(data.documents ?? []);

    useProjectStore.setState({ projects: data.projects });
    useWikiStore.setState({ pages: data.pages });
    useIssueStore.setState({
      issues: data.issues ?? [],
      comments: data.issueComments ?? [],
    });
  },
}));
