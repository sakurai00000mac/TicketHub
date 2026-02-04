import { useParams, useNavigate } from 'react-router-dom';
import { useIssueStore } from '../stores/issueStore';
import { useProjectStore } from '../stores/projectStore';

export function BoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getIssuesByStatus, updateIssue } = useIssueStore();
  const { getProject } = useProjectStore();

  if (!projectId) return null;

  const project = getProject(projectId);
  if (!project) return null;

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData('text/plain', issueId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('text/plain');
    if (issueId) {
      updateIssue(issueId, { statusId });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <h2 style={{ marginBottom: '16px' }}>ボード</h2>
      <div className="board-container">
        {project.issueStatuses.map((status) => {
          const issues = getIssuesByStatus(projectId, status.id);
          return (
            <div
              key={status.id}
              className="board-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              <div className="board-column-header" style={{ borderTopColor: status.color }}>
                <span>{status.name}</span>
                <span className="board-column-count">{issues.length}</span>
              </div>
              <div className="board-column-body">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="board-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue.id)}
                    onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
                  >
                    <span className="issue-key">{issue.key}</span>
                    <span className="board-card-title">{issue.title}</span>
                    <div className="board-card-meta">
                      <span className={`priority-${issue.priority}`}>
                        {issue.priority === 'high' ? '高' : issue.priority === 'medium' ? '中' : '低'}
                      </span>
                      {issue.dueDate && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {new Date(issue.dueDate).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
