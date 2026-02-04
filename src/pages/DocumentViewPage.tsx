import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../stores/documentStore';
import { MarkdownPreview } from '../components/Editor/MarkdownPreview';
import { FiEdit2, FiTrash2, FiArrowLeft } from 'react-icons/fi';

export function DocumentViewPage() {
  const { projectId, documentId } = useParams();
  const navigate = useNavigate();
  const { documents, deleteDocument } = useDocumentStore();

  const doc = documents.find((d) => d.id === documentId);

  if (!projectId || !doc) {
    return (
      <div className="empty-state">
        <h2>ドキュメントが見つかりません</h2>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`「${doc.title}」を削除しますか？`)) {
      deleteDocument(doc.id);
      navigate(`/projects/${projectId}/documents`);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="page-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <button
            className="btn btn-sm"
            onClick={() => navigate(`/projects/${projectId}/documents`)}
          >
            <FiArrowLeft /> 一覧
          </button>
          <h1 style={{ fontSize: '20px', margin: 0 }}>{doc.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-sm"
            onClick={() => navigate(`/projects/${projectId}/documents/${doc.id}/edit`)}
          >
            <FiEdit2 /> 編集
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <FiTrash2 /> 削除
          </button>
        </div>
      </div>

      {doc.tags.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          {doc.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      )}

      <div className="doc-meta-info">
        <span>作成日: {new Date(doc.createdAt).toLocaleDateString('ja-JP')}</span>
        <span>更新日: {new Date(doc.updatedAt).toLocaleDateString('ja-JP')}</span>
      </div>

      <MarkdownPreview content={doc.content} />
    </div>
  );
}
