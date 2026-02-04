import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../stores/documentStore';

export function DocumentNewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { addDocument } = useDocumentStore();

  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');

  if (!projectId) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const id = addDocument({
      projectId,
      title: title.trim(),
      content,
      tags,
      createdBy: 'local-user',
    });
    navigate(`/projects/${projectId}/documents/${id}`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <h2>新規ドキュメント</h2>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label>タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>タグ（カンマ区切り）</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="例: 設計, API, メモ"
        />
      </div>

      <div className="form-group">
        <label>本文（Markdown）</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="Markdownで記述してください..."
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn" onClick={() => navigate(`/projects/${projectId}/documents`)}>
          キャンセル
        </button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          作成
        </button>
      </div>
    </div>
  );
}
