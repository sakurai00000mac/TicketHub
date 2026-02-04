import type { Project, Page, Issue, IssueComment, Document } from '../types';

// ============================================
// 汎用LocalStorageアダプタ
// ============================================

function load<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ============================================
// 各データのキーと関数
// ============================================

const KEYS = {
  projects: 'wiki-projects',
  pages: 'wiki-pages',
  issues: 'wiki-issues',
  issueComments: 'wiki-issue-comments',
  documents: 'wiki-documents',
} as const;

export const loadProjects = () => load<Project>(KEYS.projects);
export const saveProjects = (data: Project[]) => save(KEYS.projects, data);

export const loadPages = () => load<Page>(KEYS.pages);
export const savePages = (data: Page[]) => save(KEYS.pages, data);

export const loadIssues = () => load<Issue>(KEYS.issues);
export const saveIssues = (data: Issue[]) => save(KEYS.issues, data);

export const loadIssueComments = () => load<IssueComment>(KEYS.issueComments);
export const saveIssueComments = (data: IssueComment[]) => save(KEYS.issueComments, data);

export const loadDocuments = () => load<Document>(KEYS.documents);
export const saveDocuments = (data: Document[]) => save(KEYS.documents, data);

// ============================================
// エクスポート/インポート
// ============================================

export function exportToFile(): void {
  const data = {
    projects: loadProjects(),
    pages: loadPages(),
    issues: loadIssues(),
    issueComments: loadIssueComments(),
    documents: loadDocuments(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `project-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportData {
  projects: Project[];
  pages: Page[];
  issues?: Issue[];
  issueComments?: IssueComment[];
  documents?: Document[];
}

export async function importFromFile(file: File): Promise<ImportData> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data.projects) || !Array.isArray(data.pages)) {
    throw new Error('無効なバックアップファイルです');
  }
  return {
    projects: data.projects,
    pages: data.pages,
    issues: data.issues ?? [],
    issueComments: data.issueComments ?? [],
    documents: data.documents ?? [],
  };
}
