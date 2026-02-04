import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWikiStore } from '../../stores/wikiStore';
import type { Page } from '../../types';
import { FiChevronRight, FiChevronDown, FiFile, FiPlus } from 'react-icons/fi';

interface PageTreeItemProps {
  page: Page;
  onNewPage: (parentId: string | null) => void;
}

type DropPosition = 'before' | 'inside' | 'after' | null;

export function PageTreeItem({ page, onNewPage }: PageTreeItemProps) {
  const { pageId: currentPageId } = useParams();
  const navigate = useNavigate();
  const { getChildPages, movePage } = useWikiStore();
  const [expanded, setExpanded] = useState(true);
  const [dropPos, setDropPos] = useState<DropPosition>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const children = getChildPages(page.id, page.projectId);
  const hasChildren = children.length > 0;
  const isActive = currentPageId === page.id;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', page.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const getDropPosition = (e: React.DragEvent): DropPosition => {
    if (!itemRef.current) return null;
    const rect = itemRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.25) return 'before';
    if (y > h * 0.75) return 'after';
    return 'inside';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropPos(getDropPosition(e));
  };

  const handleDragLeave = () => {
    setDropPos(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === page.id) {
      setDropPos(null);
      return;
    }

    const pos = getDropPosition(e);
    if (pos === 'before') {
      movePage(draggedId, page.parentId, page.order);
    } else if (pos === 'after') {
      movePage(draggedId, page.parentId, page.order + 1);
    } else if (pos === 'inside') {
      const childCount = getChildPages(page.id, page.projectId).length;
      movePage(draggedId, page.id, childCount);
      setExpanded(true);
    }
    setDropPos(null);
  };

  return (
    <div>
      <div
        ref={itemRef}
        className={`tree-item${isActive ? ' active' : ''}${dropPos ? ` drop-${dropPos}` : ''}`}
        onClick={() => navigate(`/projects/${page.projectId}/wiki/${page.id}`)}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span
          className="toggle"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />
          ) : (
            <FiFile size={12} />
          )}
        </span>
        <span className="title">{page.title}</span>
        <button
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onNewPage(page.id);
          }}
          title="子ページを追加"
          style={isActive ? { color: 'white' } : {}}
        >
          <FiPlus size={14} />
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="tree-children">
          {children.map((child) => (
            <PageTreeItem key={child.id} page={child} onNewPage={onNewPage} />
          ))}
        </div>
      )}
    </div>
  );
}
