import { create } from 'zustand';
import { ref, set as dbSet, onValue, update, remove } from 'firebase/database';
import type { Document } from '../types';
import { db } from '../config/firebase';
import { generateId } from '../utils/markdown';

interface DocumentState {
  documents: Document[];
  subscriptions: Map<string, () => void>;

  subscribeToProject: (projectId: string) => void;
  unsubscribeFromProject: (projectId: string) => void;

  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDocument: (id: string, projectId: string, updates: Partial<Pick<Document, 'title' | 'content' | 'tags'>>) => Promise<void>;
  deleteDocument: (id: string, projectId: string) => Promise<void>;
  deleteProjectDocuments: (projectId: string) => void;

  getProjectDocuments: (projectId: string) => Document[];
  getAllTags: (projectId: string) => string[];
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  subscriptions: new Map(),

  subscribeToProject: (projectId: string) => {
    const { subscriptions } = get();
    if (subscriptions.has(projectId)) return;

    const docsRef = ref(db, `projects/${projectId}/documents`);
    const unsubscribe = onValue(docsRef, (snapshot) => {
      const projectDocs: Document[] = [];
      snapshot.forEach((child) => {
        projectDocs.push({ ...child.val(), id: child.key! });
      });
      set((state) => ({
        documents: [
          ...state.documents.filter((d) => d.projectId !== projectId),
          ...projectDocs,
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

  addDocument: async (docData) => {
    const id = generateId();
    const doc: Document = {
      ...docData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await dbSet(ref(db, `projects/${docData.projectId}/documents/${id}`), doc);
    return id;
  },

  updateDocument: async (id, projectId, updates) => {
    await update(ref(db, `projects/${projectId}/documents/${id}`), {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  deleteDocument: async (id, projectId) => {
    await remove(ref(db, `projects/${projectId}/documents/${id}`));
  },

  deleteProjectDocuments: (projectId) => {
    set((state) => ({
      documents: state.documents.filter((d) => d.projectId !== projectId),
    }));
  },

  getProjectDocuments: (projectId) => {
    return get()
      .documents.filter((d) => d.projectId === projectId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getAllTags: (projectId) => {
    const docs = get().documents.filter((d) => d.projectId === projectId);
    const tagSet = new Set<string>();
    for (const doc of docs) {
      for (const tag of doc.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  },
}));
