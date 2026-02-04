import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../stores/documentStore';
import { FiPlus } from 'react-icons/fi';

export function DocumentListPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProjectDocuments, getAllTags } = useDocumentStore();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  if (!projectId) return null;

  const documents = getProjectDocuments(projectId);
  const allTags = getAllTags(projectId);

  const filtered = documents.filter((doc) => {
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTag && !doc.tags.includes(selectedTag)) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>ドキュメント</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/projects/${projectId}/documents/new`)}
        >
          <FiPlus /> 新規作成
        </button>
      </div>

      {documents.length > 0 && (
        <div className="doc-filter-bar">
          <input
            type="text"
            placeholder="タイトルで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {allTags.length > 0 && (
            <div className="doc-tag-filters">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-pill${selectedTag === tag ? ' active' : ''}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h2>{documents.length === 0 ? 'ドキュメントがありません' : '該当するドキュメントがありません'}</h2>
          <p>{documents.length === 0 ? '「新規作成」ボタンからドキュメントを作成してください。' : '検索条件を変更してください。'}</p>
        </div>
      ) : (
        <div className="doc-list">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="doc-card"
              onClick={() => navigate(`/projects/${projectId}/documents/${doc.id}`)}
            >
              <h3>{doc.title}</h3>
              <p>{doc.content.slice(0, 120).replace(/[#*`\[\]]/g, '')}</p>
              <div className="doc-card-meta">
                <div className="doc-card-tags">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                </div>
                <span>{new Date(doc.updatedAt).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
