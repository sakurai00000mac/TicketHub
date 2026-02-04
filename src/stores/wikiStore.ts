import { create } from 'zustand';
import type { Page } from '../types';
import { loadPages, savePages } from '../utils/storage';
import { generateId, generateSlug } from '../utils/markdown';

interface WikiState {
  pages: Page[];
  addPage: (projectId: string, title: string, parentId: string | null) => string;
  updatePage: (id: string, updates: Partial<Pick<Page, 'title' | 'content' | 'parentId' | 'order'>>) => void;
  deletePage: (id: string) => void;
  movePage: (pageId: string, newParentId: string | null, newOrder: number) => void;
  deleteProjectPages: (projectId: string) => void;
  getProjectPages: (projectId: string) => Page[];
  getChildPages: (parentId: string | null, projectId: string) => Page[];
}

export const useWikiStore = create<WikiState>((set, get) => ({
  pages: loadPages(),

  addPage: (projectId, title, parentId) => {
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
    set((state) => {
      const pages = [...state.pages, page];
      savePages(pages);
      return { pages };
    });
    return id;
  },

  updatePage: (id, updates) => {
    set((state) => {
      const pages = state.pages.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              slug: updates.title ? generateSlug(updates.title) : p.slug,
              updatedAt: Date.now(),
            }
          : p
      );
      savePages(pages);
      return { pages };
    });
  },

  deletePage: (id) => {
    const deleteRecursive = (pageId: string, allPages: Page[]): Page[] => {
      const children = allPages.filter((p) => p.parentId === pageId);
      let remaining = allPages.filter((p) => p.id !== pageId);
      for (const child of children) {
        remaining = deleteRecursive(child.id, remaining);
      }
      return remaining;
    };

    set((state) => {
      const pages = deleteRecursive(id, state.pages);
      savePages(pages);
      return { pages };
    });
  },

  movePage: (pageId, newParentId, newOrder) => {
    set((state) => {
      const page = state.pages.find((p) => p.id === pageId);
      if (!page) return state;

      const siblings = state.pages
        .filter((p) => p.projectId === page.projectId && p.parentId === newParentId && p.id !== pageId)
        .sort((a, b) => a.order - b.order);

      siblings.splice(newOrder, 0, { ...page, parentId: newParentId } as Page);

      const updatedIds = new Map<string, { parentId: string | null; order: number }>();
      siblings.forEach((s, i) => updatedIds.set(s.id, { parentId: newParentId, order: i }));

      const pages = state.pages.map((p) => {
        const update = updatedIds.get(p.id);
        if (update) return { ...p, ...update };
        return p;
      });

      savePages(pages);
      return { pages };
    });
  },

  deleteProjectPages: (projectId) => {
    set((state) => {
      const pages = state.pages.filter((p) => p.projectId !== projectId);
      savePages(pages);
      return { pages };
    });
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
