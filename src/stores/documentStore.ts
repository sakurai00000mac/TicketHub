import { create } from 'zustand';
import type { Document } from '../types';
import { loadDocuments, saveDocuments } from '../utils/storage';
import { generateId } from '../utils/markdown';

interface DocumentState {
  documents: Document[];

  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDocument: (id: string, updates: Partial<Pick<Document, 'title' | 'content' | 'tags'>>) => void;
  deleteDocument: (id: string) => void;
  deleteProjectDocuments: (projectId: string) => void;

  getProjectDocuments: (projectId: string) => Document[];
  getAllTags: (projectId: string) => string[];
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: loadDocuments(),

  addDocument: (docData) => {
    const id = generateId();
    const doc: Document = {
      ...docData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => {
      const documents = [...state.documents, doc];
      saveDocuments(documents);
      return { documents };
    });
    return id;
  },

  updateDocument: (id, updates) => {
    set((state) => {
      const documents = state.documents.map((d) =>
        d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
      );
      saveDocuments(documents);
      return { documents };
    });
  },

  deleteDocument: (id) => {
    set((state) => {
      const documents = state.documents.filter((d) => d.id !== id);
      saveDocuments(documents);
      return { documents };
    });
  },

  deleteProjectDocuments: (projectId) => {
    set((state) => {
      const documents = state.documents.filter((d) => d.projectId !== projectId);
      saveDocuments(documents);
      return { documents };
    });
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
