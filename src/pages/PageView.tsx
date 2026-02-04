import { useParams, useNavigate } from 'react-router-dom';
import { useWikiStore } from '../stores/wikiStore';
import { MarkdownPreview } from '../components/Editor/MarkdownPreview';
import { FiEdit2 } from 'react-icons/fi';

export function PageView() {
  const { projectId, pageId } = useParams();
  const navigate = useNavigate();
  const { pages } = useWikiStore();
  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    return (
      <div className="empty-state">
        <h2>ページを選択してください</h2>
        <p>サイドバーからページを選択するか、新しいページを作成してください。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-view-header">
        <h1>{page.title}</h1>
        <button
          className="btn"
          onClick={() => navigate(`/projects/${projectId}/wiki/${pageId}/edit`)}
        >
          <FiEdit2 /> 編集
        </button>
      </div>
      <MarkdownPreview content={page.content} />
    </div>
  );
}
