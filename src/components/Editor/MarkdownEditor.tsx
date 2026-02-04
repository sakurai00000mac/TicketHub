import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWikiStore } from '../../stores/wikiStore';
import { MarkdownPreview } from './MarkdownPreview';
import { FiSave, FiX, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';

export function MarkdownEditor() {
  const { projectId, pageId } = useParams();
  const navigate = useNavigate();
  const { pages, updatePage, deletePage } = useWikiStore();
  const page = pages.find((p) => p.id === pageId);

  const [title, setTitle] = useState(page?.title ?? '');
  const [content, setContent] = useState(page?.content ?? '');
  const [splitRatio, setSplitRatio] = useState(50);
  const [showPreview, setShowPreview] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContent(page.content);
    }
  }, [page]);

  const handleClose = useCallback(() => {
    if (projectId && pageId) {
      navigate(`/projects/${projectId}/wiki/${pageId}`);
    } else if (projectId) {
      navigate(`/projects/${projectId}/wiki`);
    }
  }, [projectId, pageId, navigate]);

  const handleSave = useCallback(() => {
    if (!page) return;
    updatePage(page.id, { title: title.trim() || '無題', content });
    handleClose();
  }, [page, title, content, updatePage, handleClose]);

  const handleDelete = useCallback(() => {
    if (!page) return;
    if (window.confirm(`「${page.title}」を削除しますか？子ページも削除されます。`)) {
      deletePage(page.id);
      if (projectId) navigate(`/projects/${projectId}/wiki`);
    }
  }, [page, deletePage, projectId, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(Math.max(ratio, 20), 80));
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!page) return null;

  return (
    <div className="editor-wrapper">
      <div className="editor-toolbar">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ページタイトル"
        />
        <button
          className="btn btn-sm"
          onClick={() => setShowPreview((v) => !v)}
          title={showPreview ? 'プレビューを隠す' : 'プレビューを表示'}
        >
          {showPreview ? <FiEyeOff /> : <FiEye />}
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>
          <FiSave /> 保存
        </button>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          <FiTrash2 /> 削除
        </button>
        <button className="btn btn-sm" onClick={handleClose}>
          <FiX /> 閉じる
        </button>
      </div>
      <div className="editor-container" ref={containerRef}>
        <div className="editor-pane" style={showPreview ? { flex: `0 0 ${splitRatio}%` } : { flex: 1 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdownで記述してください..."
          />
        </div>
        {showPreview && (
          <>
            <div className="editor-divider" onMouseDown={handleMouseDown} />
            <div className="preview-pane" style={{ flex: `0 0 ${100 - splitRatio}%` }}>
              <MarkdownPreview content={content} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
