import type { Page } from '../types';

// [[ページ名]] 形式のWikiリンクをMarkdownリンクに変換
export function resolveWikiLinks(
  content: string,
  pages: Page[],
  projectId: string
): string {
  return content.replace(/\[\[(.+?)\]\]/g, (_match, pageName: string) => {
    const trimmed = pageName.trim();
    const target = pages.find(
      (p) => p.projectId === projectId && p.title === trimmed
    );
    if (target) {
      return `[${trimmed}](wiki-page/${target.id})`;
    }
    // リンク先が見つからない場合は赤リンク風に表示
    return `<span class="wiki-link-missing">${trimmed}</span>`;
  });
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u3000-\u9fff\uf900-\ufaff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
