import { create } from 'zustand';
import { ref, set as dbSet, onValue, update, remove } from 'firebase/database';
import type { Page } from '../types';
import { db } from '../config/firebase';
import { generateId, generateSlug } from '../utils/markdown';

interface WikiState {
  pages: Page[];
  subscriptions: Map<string, () => void>;

  subscribeToProject: (projectId: string) => void;
  unsubscribeFromProject: (projectId: string) => void;

  addPage: (projectId: string, title: string, parentId: string | null) => Promise<string>;
  updatePage: (id: string, projectId: string, updates: Partial<Pick<Page, 'title' | 'content' | 'parentId' | 'order'>>) => Promise<void>;
  deletePage: (id: string, projectId: string) => Promise<void>;
  movePage: (pageId: string, projectId: string, newParentId: string | null, newOrder: number) => Promise<void>;
  deleteProjectPages: (projectId: string) => void;
  getProjectPages: (projectId: string) => Page[];
  getChildPages: (parentId: string | null, projectId: string) => Page[];
}

export const useWikiStore = create<WikiState>((set, get) => ({
  pages: [],
  subscriptions: new Map(),

  subscribeToProject: (projectId: string) => {
    const { subscriptions } = get();
    if (subscriptions.has(projectId)) return;

    const pagesRef = ref(db, `projects/${projectId}/pages`);
    const unsubscribe = onValue(pagesRef, (snapshot) => {
      const projectPages: Page[] = [];
      snapshot.forEach((child) => {
        projectPages.push({ ...child.val(), id: child.key! });
      });
      set((state) => ({
        pages: [
          ...state.pages.filter((p) => p.projectId !== projectId),
          ...projectPages,
        ],
      }));
    });

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

  addPage: async (projectId, title, parentId) => {
    const id = generateId();
    const siblings = get().getChildPages(parentId, projectId);
    const page: Page = {
      id,
      projectId,
      title,
      slug: generateSlug(title),
      content: '',
      parentId,
      order: siblings.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await dbSet(ref(db, `projects/${projectId}/pages/${id}`), page);
    return id;
  },

  updatePage: async (id, projectId, updates) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;

    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.title) {
      updateData.slug = generateSlug(updates.title);
    }

    await update(ref(db, `projects/${projectId}/pages/${id}`), updateData);
  },

  deletePage: async (id, projectId) => {
    const { pages } = get();

    // Find all child pages recursively
    const findAllChildren = (parentId: string): string[] => {
      const children = pages.filter((p) => p.parentId === parentId);
      return children.flatMap((c) => [c.id, ...findAllChildren(c.id)]);
    };

    const idsToDelete = [id, ...findAllChildren(id)];

    for (const pageId of idsToDelete) {
      await remove(ref(db, `projects/${projectId}/pages/${pageId}`));
    }
  },

  movePage: async (pageId, projectId, newParentId, newOrder) => {
    const { pages } = get();
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    const siblings = pages
      .filter((p) => p.projectId === projectId && p.parentId === newParentId && p.id !== pageId)
      .sort((a, b) => a.order - b.order);

    siblings.splice(newOrder, 0, { ...page, parentId: newParentId } as Page);

    // Update all affected pages
    for (let i = 0; i < siblings.length; i++) {
      const s = siblings[i];
      await update(ref(db, `projects/${projectId}/pages/${s.id}`), {
        parentId: newParentId,
        order: i,
      });
    }
  },

  deleteProjectPages: (projectId) => {
    set((state) => ({
      pages: state.pages.filter((p) => p.projectId !== projectId),
    }));
  },

  getProjectPages: (projectId) => {
    return get().pages.filter((p) => p.projectId === projectId);
  },

  getChildPages: (parentId, projectId) => {
    return get()
      .pages.filter((p) => p.projectId === projectId && p.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  },
}));
