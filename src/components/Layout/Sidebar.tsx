import { useParams } from 'react-router-dom';
import { useWikiStore } from '../../stores/wikiStore';
import { PageTreeItem } from '../PageTree/PageTreeItem';
import { FiPlus, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

interface SidebarProps {
  onNewPage: (parentId: string | null) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ onNewPage, collapsed, onToggle }: SidebarProps) {
  const { projectId } = useParams();
  const { getChildPages } = useWikiStore();

  if (!projectId) return null;

  const rootPages = getChildPages(null, projectId);

  if (collapsed) {
    return (
      <aside className="sidebar sidebar-collapsed">
        <button className="btn-icon sidebar-toggle" onClick={onToggle} title="サイドバーを開く">
          <FiChevronsRight size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>ページ一覧</h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-sm" onClick={() => onNewPage(null)}>
            <FiPlus /> 追加
          </button>
          <button className="btn-icon" onClick={onToggle} title="サイドバーを閉じる">
            <FiChevronsLeft size={16} />
          </button>
        </div>
      </div>
      <div className="sidebar-content">
        {rootPages.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center' }}>
            ページがありません
          </div>
        ) : (
          rootPages.map((page) => (
            <PageTreeItem key={page.id} page={page} onNewPage={onNewPage} />
          ))
        )}
      </div>
    </aside>
  );
}
