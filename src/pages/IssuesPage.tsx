import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIssueStore } from '../stores/issueStore';
import { useProjectStore } from '../stores/projectStore';
import { FiPlus, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { useIssueFilter } from '../hooks/useIssueFilter';
import { IssueFilter } from '../components/common/IssueFilter';
import type { Issue } from '../types';

// ツリー構造を構築
function buildTree(issues: Issue[]): { issue: Issue; children: Issue[] }[] {
  const childIds = new Set(issues.filter((i) => i.parentId && issues.some((p) => p.id === i.parentId)).map((i) => i.id));
  const roots = issues.filter((i) => !childIds.has(i.id) || !i.parentId || !issues.some((p) => p.id === i.parentId));
  return roots.map((issue) => ({
    issue,
    children: issues.filter((i) => i.parentId === issue.id),
  }));
}

export function IssuesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProjectIssues } = useIssueStore();
  const { getProject } = useProjectStore();
  const {
    keyword, setKeyword,
    typeId, setTypeId,
    statusId, setStatusId,
    priority, setPriority,
    filterIssues
  } = useIssueFilter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (!projectId) return null;

  const issues = getProjectIssues(projectId);
  const filteredIssues = filterIssues(issues);
  const project = getProject(projectId);
  const tree = buildTree(filteredIssues);

  const renderRow = (issue: Issue, depth: number, hasChildren: boolean) => {
    const status = project?.issueStatuses.find((s) => s.id === issue.statusId);
    const type = project?.issueTypes.find((t) => t.id === issue.typeId);
    const isCollapsed = collapsed[issue.id];

    return (
      <tr
        key={issue.id}
        className={hasChildren ? 'issue-row-parent' : depth > 0 ? 'issue-row-child' : ''}
        onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
        style={{ cursor: 'pointer' }}
      >
        <td className="issue-toggle-cell" style={{ paddingLeft: depth * 16 }}>
          {hasChildren ? (
            <button
              className="tree-toggle-btn"
              onClick={(e) => toggleCollapse(issue.id, e)}
            >
              {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
            </button>
          ) : null}
        </td>
        <td>
          <span
            className="status-badge"
            style={{
              background: type?.color ?? '#6b7280',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {type?.name ?? '不明'}
          </span>
        </td>
        <td><span className="issue-key">{issue.key}</span></td>
        <td>{issue.title}</td>
        <td>
          <span
            className="status-badge"
            style={{ background: status?.color ?? '#6b7280' }}
          >
            {status?.name ?? '不明'}
          </span>
        </td>
        <td>
          <span className={`priority-${issue.priority}`}>
            {issue.priority === 'high' ? '高' : issue.priority === 'medium' ? '中' : '低'}
          </span>
        </td>
        <td>
          {issue.startDate
            ? new Date(issue.startDate).toLocaleDateString('ja-JP')
            : '-'}
        </td>
        <td>
          {issue.dueDate
            ? new Date(issue.dueDate).toLocaleDateString('ja-JP')
            : '-'}
        </td>
      </tr>
    );
  };

  const renderTree = (items: { issue: Issue; children: Issue[] }[], depth: number) => {
    const rows: React.ReactNode[] = [];
    for (const { issue, children } of items) {
      const hasChildren = children.length > 0;
      rows.push(renderRow(issue, depth, hasChildren));

      if (hasChildren && !collapsed[issue.id]) {
        const childTree = children.map((child) => ({
          issue: child,
          children: issues.filter((i) => i.parentId === child.id),
        }));
        rows.push(...renderTree(childTree, depth + 1));
      }
    }
    return rows;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>課題一覧</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/projects/${projectId}/issues/new`)}
        >
          <FiPlus /> 課題を追加
        </button>
      </div>

      <IssueFilter
        project={project!}
        keyword={keyword}
        setKeyword={setKeyword}
        typeId={typeId}
        setTypeId={setTypeId}
        statusId={statusId}
        setStatusId={setStatusId}
        priority={priority}
        setPriority={setPriority}
      />

      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          <h2>課題がありません</h2>
          <p>「課題を追加」ボタンから最初の課題を作成してください。</p>
        </div>
      ) : (
        <div className="issue-table-wrapper">
          <table className="issue-table">
            <thead>
              <tr>
                <th className="issue-toggle-th"></th>
                <th>種別</th>
                <th>キー</th>
                <th>件名</th>
                <th>ステータス</th>
                <th>優先度</th>
                <th>開始日</th>
                <th>期限</th>
              </tr>
            </thead>
            <tbody>
              {renderTree(tree, 0)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
