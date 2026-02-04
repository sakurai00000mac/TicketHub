import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIssueStore } from '../stores/issueStore';
import { useProjectStore } from '../stores/projectStore';
import type { Issue } from '../types';

type ViewMode = 'day' | 'week' | 'month';

const DAY_MS = 86400000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ts: number, days: number): number {
  return ts + days * DAY_MS;
}

function diffDays(a: number, b: number): number {
  return Math.round((b - a) / DAY_MS);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function formatMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
}

// タイムライン範囲計算
function getTimelineRange(issues: Issue[]): { start: number; end: number } {
  const now = startOfDay(Date.now());
  let min = now;
  let max = addDays(now, 30);

  for (const issue of issues) {
    if (issue.startDate) {
      const s = startOfDay(issue.startDate);
      if (s < min) min = s;
    }
    if (issue.dueDate) {
      const e = startOfDay(issue.dueDate);
      if (e > max) max = e;
    }
  }

  // 前後に余白
  min = addDays(min, -7);
  max = addDays(max, 14);

  return { start: min, end: max };
}

// 親課題の要約範囲
function getParentRange(issue: Issue, allIssues: Issue[]): { start: number; end: number } | null {
  const children = allIssues.filter((i) => i.parentId === issue.id);
  if (children.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;

  for (const child of children) {
    if (child.startDate) min = Math.min(min, child.startDate);
    if (child.dueDate) max = Math.max(max, child.dueDate);
  }

  if (min === Infinity || max === -Infinity) return null;
  return { start: min, end: max };
}

// 課題をツリー順にフラット化
function flattenIssues(issues: Issue[]): { issue: Issue; depth: number }[] {
  const result: { issue: Issue; depth: number }[] = [];
  const roots = issues.filter((i) => !i.parentId || !issues.find((p) => p.id === i.parentId));

  function walk(items: Issue[], depth: number) {
    for (const item of items) {
      result.push({ issue: item, depth });
      const children = issues.filter((i) => i.parentId === item.id);
      if (children.length > 0) walk(children, depth + 1);
    }
  }

  walk(roots, 0);
  return result;
}

export function GanttPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProjectIssues, updateIssue } = useIssueStore();
  const { getProject } = useProjectStore();
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  // ドラッグ状態
  const [dragInfo, setDragInfo] = useState<{
    issueId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  if (!projectId) return null;
  const project = getProject(projectId);
  if (!project) return null;

  const allIssues = getProjectIssues(projectId);
  const issuesWithDates = allIssues.filter((i) => i.startDate && i.dueDate);
  const issuesWithoutDates = allIssues.filter((i) => !i.startDate || !i.dueDate);

  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getTimelineRange(allIssues),
    [allIssues]
  );

  const totalDays = diffDays(timelineStart, timelineEnd);
  const flatList = useMemo(() => flattenIssues(issuesWithDates), [issuesWithDates]);

  // ビューモードに応じたセル幅
  const cellWidth = viewMode === 'day' ? 32 : viewMode === 'week' ? 20 : 8;
  const chartWidth = totalDays * cellWidth;

  // タイムラインヘッダーのセル生成
  const headerCells = useMemo(() => {
    const cells: { label: string; span: number; key: string }[] = [];

    if (viewMode === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(timelineStart, i);
        cells.push({ label: new Date(d).getDate().toString(), span: 1, key: `d-${i}` });
      }
    } else if (viewMode === 'week') {
      for (let i = 0; i < totalDays; i += 7) {
        const d = addDays(timelineStart, i);
        const span = Math.min(7, totalDays - i);
        cells.push({ label: formatDate(d), span, key: `w-${i}` });
      }
    } else {
      let i = 0;
      while (i < totalDays) {
        const d = new Date(addDays(timelineStart, i));
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const remaining = diffDays(addDays(timelineStart, i), endOfMonth.getTime()) + 1;
        const span = Math.min(remaining, totalDays - i);
        cells.push({ label: formatMonth(d.getTime()), span, key: `m-${i}` });
        i += span;
      }
    }
    return cells;
  }, [viewMode, totalDays, timelineStart]);

  // 月ヘッダー（day/weekモード用）
  const monthHeaders = useMemo(() => {
    if (viewMode === 'month') return [];
    const headers: { label: string; span: number; key: string }[] = [];
    let i = 0;
    while (i < totalDays) {
      const d = new Date(addDays(timelineStart, i));
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const remaining = diffDays(addDays(timelineStart, i), endOfMonth.getTime()) + 1;
      const span = Math.min(remaining, totalDays - i);
      headers.push({ label: formatMonth(d.getTime()), span, key: `mh-${i}` });
      i += span;
    }
    return headers;
  }, [viewMode, totalDays, timelineStart]);

  // 今日の位置
  const todayOffset = diffDays(timelineStart, startOfDay(Date.now()));

  // バー位置計算
  const getBarStyle = (start: number, end: number) => {
    const left = diffDays(timelineStart, startOfDay(start)) * cellWidth;
    const width = Math.max((diffDays(startOfDay(start), startOfDay(end)) + 1) * cellWidth, cellWidth);
    return { left, width };
  };

  // ドラッグ操作
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, issueId: string, type: 'move' | 'resize-start' | 'resize-end') => {
      e.preventDefault();
      e.stopPropagation();
      const issue = allIssues.find((i) => i.id === issueId);
      if (!issue?.startDate || !issue?.dueDate) return;

      setDragInfo({
        issueId,
        type,
        startX: e.clientX,
        origStart: issue.startDate,
        origEnd: issue.dueDate,
      });

      const handleMouseMove = (me: MouseEvent) => {
        if (!chartRef.current) return;
        const dx = me.clientX - e.clientX;
        const daysDelta = Math.round(dx / cellWidth);
        if (daysDelta === 0) return;

        if (type === 'move') {
          updateIssue(issueId, {
            startDate: addDays(issue.startDate!, daysDelta),
            dueDate: addDays(issue.dueDate!, daysDelta),
          });
        } else if (type === 'resize-start') {
          const newStart = addDays(issue.startDate!, daysDelta);
          if (newStart < issue.dueDate!) {
            updateIssue(issueId, { startDate: newStart });
          }
        } else if (type === 'resize-end') {
          const newEnd = addDays(issue.dueDate!, daysDelta);
          if (newEnd > issue.startDate!) {
            updateIssue(issueId, { dueDate: newEnd });
          }
        }
      };

      const handleMouseUp = () => {
        setDragInfo(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = type === 'move' ? 'grabbing' : 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [allIssues, cellWidth, updateIssue]
  );

  return (
    <div className="gantt-page">
      <div className="gantt-toolbar">
        <h2>ガントチャート</h2>
        <div className="gantt-view-toggle">
          <button className={`btn btn-sm${viewMode === 'day' ? ' btn-primary' : ''}`} onClick={() => setViewMode('day')}>日</button>
          <button className={`btn btn-sm${viewMode === 'week' ? ' btn-primary' : ''}`} onClick={() => setViewMode('week')}>週</button>
          <button className={`btn btn-sm${viewMode === 'month' ? ' btn-primary' : ''}`} onClick={() => setViewMode('month')}>月</button>
        </div>
      </div>

      {allIssues.length === 0 ? (
        <div className="empty-state">
          <h2>課題がありません</h2>
          <p>課題を作成して開始日・期限を設定するとガントチャートに表示されます。</p>
        </div>
      ) : (
        <div className="gantt-wrapper">
          {/* 左側: 課題名リスト */}
          <div className="gantt-sidebar">
            <div className="gantt-sidebar-header">
              {viewMode !== 'month' && <div className="gantt-header-row">&nbsp;</div>}
              <div className="gantt-header-row">課題</div>
            </div>
            {flatList.map(({ issue, depth }) => (
              <div
                key={issue.id}
                className="gantt-sidebar-row"
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
              >
                <span className="issue-key">{issue.key}</span>
                <span className="gantt-sidebar-title">{issue.title}</span>
              </div>
            ))}
            {issuesWithoutDates.length > 0 && (
              <div className="gantt-sidebar-section">
                <small>日程未設定 ({issuesWithoutDates.length}件)</small>
              </div>
            )}
          </div>

          {/* 右側: チャート */}
          <div className="gantt-chart-scroll" ref={chartRef}>
            <div className="gantt-chart" style={{ width: chartWidth }}>
              {/* ヘッダー */}
              <div className="gantt-timeline-header">
                {viewMode !== 'month' && (
                  <div className="gantt-header-row gantt-month-row">
                    {monthHeaders.map((h) => (
                      <div key={h.key} className="gantt-header-cell" style={{ width: h.span * cellWidth }}>
                        {h.label}
                      </div>
                    ))}
                  </div>
                )}
                <div className="gantt-header-row">
                  {headerCells.map((h) => (
                    <div key={h.key} className="gantt-header-cell" style={{ width: h.span * cellWidth }}>
                      {h.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* 今日の線 */}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div className="gantt-today" style={{ left: todayOffset * cellWidth + cellWidth / 2 }} />
              )}

              {/* バー行 */}
              {flatList.map(({ issue }) => {
                if (!issue.startDate || !issue.dueDate) return null;

                const hasChildren = allIssues.some((i) => i.parentId === issue.id);
                const parentRange = hasChildren ? getParentRange(issue, allIssues) : null;
                const status = project.issueStatuses.find((s) => s.id === issue.statusId);

                const bar = getBarStyle(issue.startDate, issue.dueDate);
                const summaryBar = parentRange ? getBarStyle(parentRange.start, parentRange.end) : null;

                return (
                  <div key={issue.id} className="gantt-row">
                    {/* 通常バー */}
                    <div
                      className={`gantt-bar${dragInfo?.issueId === issue.id ? ' dragging' : ''}`}
                      style={{
                        left: bar.left,
                        width: bar.width,
                        background: status?.color ?? '#2563eb',
                      }}
                    >
                      <div
                        className="gantt-bar-handle gantt-bar-handle-left"
                        onMouseDown={(e) => handleMouseDown(e, issue.id, 'resize-start')}
                      />
                      <div
                        className="gantt-bar-body"
                        onMouseDown={(e) => handleMouseDown(e, issue.id, 'move')}
                      >
                        <span className="gantt-bar-label">{issue.title}</span>
                      </div>
                      <div
                        className="gantt-bar-handle gantt-bar-handle-right"
                        onMouseDown={(e) => handleMouseDown(e, issue.id, 'resize-end')}
                      />
                    </div>

                    {/* 親課題の要約バー */}
                    {summaryBar && (
                      <div
                        className="gantt-summary-bar"
                        style={{
                          left: summaryBar.left,
                          width: summaryBar.width,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
