import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../stores/documentStore';
import { MarkdownPreview } from '../components/Editor/MarkdownPreview';
import { FiSave, FiX, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';

export function DocumentEditPage() {
  const { projectId, documentId } = useParams();
  const navigate = useNavigate();
  const { documents, updateDocument, deleteDocument } = useDocumentStore();
  const doc = documents.find((d) => d.id === documentId);

  const [title, setTitle] = useState(doc?.title ?? '');
  const [content, setContent] = useState(doc?.content ?? '');
  const [tagsInput, setTagsInput] = useState(doc?.tags.join(', ') ?? '');
  const [splitRatio, setSplitRatio] = useState(50);
  const [showPreview, setShowPreview] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setTagsInput(doc.tags.join(', '));
    }
  }, [doc]);

  const handleClose = useCallback(() => {
    if (projectId && documentId) {
      navigate(`/projects/${projectId}/documents/${documentId}`);
    }
  }, [projectId, documentId, navigate]);

  const handleSave = useCallback(async () => {
    if (!doc || !projectId) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await updateDocument(doc.id, projectId, { title: title.trim() || '無題', content, tags });
  }, [doc, projectId, title, content, tagsInput, updateDocument]);

  const handleDelete = useCallback(async () => {
    if (!doc || !projectId) return;
    if (window.confirm(`「${doc.title}」を削除しますか？`)) {
      await deleteDocument(doc.id, projectId);
      navigate(`/projects/${projectId}/documents`);
    }
  }, [doc, deleteDocument, projectId, navigate]);

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

  if (!doc) return null;

  return (
    <div className="editor-wrapper">
      <div className="editor-toolbar">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ドキュメントタイトル"
        />
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="タグ（カンマ区切り）"
          style={{ flex: '0 0 200px' }}
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
