import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIssueStore } from '../stores/issueStore';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { useIssueFilter } from '../hooks/useIssueFilter';
import { IssueFilter } from '../components/common/IssueFilter';
import type { Issue } from '../types';

type ViewMode = 'day' | 'week' | 'month';
type DayType = 'weekday' | 'saturday' | 'sunday' | 'holiday';

const DAY_MS = 86400000;

// 日本の祝日判定
function getJapaneseHolidays(year: number): Set<string> {
  const holidays = new Set<string>();
  const add = (m: number, d: number) => holidays.add(`${year}-${m}-${d}`);

  // 固定祝日
  add(1, 1);   // 元日
  add(2, 11);  // 建国記念の日
  add(2, 23);  // 天皇誕生日
  add(4, 29);  // 昭和の日
  add(5, 3);   // 憲法記念日
  add(5, 4);   // みどりの日
  add(5, 5);   // こどもの日
  add(8, 11);  // 山の日
  add(11, 3);  // 文化の日
  add(11, 23); // 勤労感謝の日

  // ハッピーマンデー
  const nthMonday = (month: number, n: number) => {
    const d = new Date(year, month - 1, 1);
    const firstDay = d.getDay();
    const firstMonday = firstDay <= 1 ? 2 - firstDay : 9 - firstDay;
    return firstMonday + (n - 1) * 7;
  };
  add(1, nthMonday(1, 2));   // 成人の日
  add(7, nthMonday(7, 3));   // 海の日
  add(9, nthMonday(9, 3));   // 敬老の日
  add(10, nthMonday(10, 2)); // スポーツの日

  // 春分・秋分（近似計算）
  const vernalEquinox = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  const autumnalEquinox = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  add(3, vernalEquinox);
  add(9, autumnalEquinox);

  // 振替休日: 祝日が日曜の場合、翌月曜が休み
  const entries = Array.from(holidays);
  for (const key of entries) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getDay() === 0) {
      add(m, d + 1);
    }
  }

  return holidays;
}

function getDayType(ts: number): DayType {
  const d = new Date(ts);
  const year = d.getFullYear();
  const key = `${year}-${d.getMonth() + 1}-${d.getDate()}`;
  const holidays = getJapaneseHolidays(year);
  if (holidays.has(key)) return 'holiday';
  if (d.getDay() === 0) return 'sunday';
  if (d.getDay() === 6) return 'saturday';
  return 'weekday';
}

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



// 課題をツリー順にフラット化（ツリー接続線の情報付き）
interface FlatItem {
  issue: Issue;
  depth: number;
  isLast: boolean;          // 兄弟の中で最後か
  parentIsLasts: boolean[]; // 各深さの親が最後の子かどうか（│の描画判定用）
}

function flattenIssues(issues: Issue[]): FlatItem[] {
  const result: FlatItem[] = [];
  const roots = issues.filter((i) => !i.parentId || !issues.find((p) => p.id === i.parentId));

  function walk(items: Issue[], depth: number, parentIsLasts: boolean[]) {
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const isLast = idx === items.length - 1;
      result.push({ issue: item, depth, isLast, parentIsLasts: [...parentIsLasts] });
      const children = issues.filter((i) => i.parentId === item.id);
      if (children.length > 0) walk(children, depth + 1, [...parentIsLasts, isLast]);
    }
  }

  walk(roots, 0, []);
  return result;
}

export function GanttPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getProjectIssues, updateIssue } = useIssueStore();
  const { getProject } = useProjectStore();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const {
    keyword, setKeyword,
    typeId, setTypeId,
    statusId, setStatusId,
    priority, setPriority,
    filterIssues
  } = useIssueFilter();

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
  const filteredIssues = filterIssues(allIssues);
  const issuesWithDates = filteredIssues.filter((i) => i.startDate && i.dueDate);
  const issuesWithoutDates = filteredIssues.filter((i) => !i.startDate || !i.dueDate);

  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getTimelineRange(filteredIssues),
    [filteredIssues]
  );

  const totalDays = diffDays(timelineStart, timelineEnd);
  const flatList = useMemo(() => flattenIssues(issuesWithDates), [issuesWithDates]);

  // ビューモードに応じたセル幅
  const cellWidth = viewMode === 'day' ? 32 : viewMode === 'week' ? 20 : 8;
  const chartWidth = totalDays * cellWidth;

  // 日ごとの曜日タイプ（日表示用）
  const dayTypes = useMemo(() => {
    if (viewMode !== 'day') return [];
    return Array.from({ length: totalDays }, (_, i) => getDayType(addDays(timelineStart, i)));
  }, [viewMode, totalDays, timelineStart]);

  // タイムラインヘッダーのセル生成
  const headerCells = useMemo(() => {
    const cells: { label: string; span: number; key: string; dayType?: DayType }[] = [];

    if (viewMode === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(timelineStart, i);
        cells.push({ label: new Date(d).getDate().toString(), span: 1, key: `d-${i}`, dayType: getDayType(d) });
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

        const userId = user?.id ?? '';
        if (type === 'move') {
          updateIssue(issueId, {
            startDate: addDays(issue.startDate!, daysDelta),
            dueDate: addDays(issue.dueDate!, daysDelta),
          }, userId);
        } else if (type === 'resize-start') {
          const newStart = addDays(issue.startDate!, daysDelta);
          if (newStart <= issue.dueDate!) {
            updateIssue(issueId, { startDate: newStart }, userId);
          }
        } else if (type === 'resize-end') {
          const newEnd = addDays(issue.dueDate!, daysDelta);
          if (newEnd >= issue.startDate!) {
            updateIssue(issueId, { dueDate: newEnd }, userId);
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
    [allIssues, cellWidth, updateIssue, user]
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

      <div style={{ padding: '0 16px 8px' }}>
        <IssueFilter
          project={project}
          keyword={keyword}
          setKeyword={setKeyword}
          typeId={typeId}
          setTypeId={setTypeId}
          statusId={statusId}
          setStatusId={setStatusId}
          priority={priority}
          setPriority={setPriority}
        />
      </div>

      {filteredIssues.length === 0 ? (
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
            {flatList.map(({ issue, depth, isLast, parentIsLasts }) => {
              const status = project.issueStatuses.find(s => s.id === issue.statusId);
              return (
                <div
                  key={issue.id}
                  className="gantt-sidebar-row"
                  style={{ paddingLeft: '8px' }}
                  onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                    {depth > 0 && (
                      <span className="gantt-tree-connector">
                        {parentIsLasts.slice(1).map((pIsLast, i) => (
                          <span key={i} className="gantt-tree-pipe">{pIsLast ? '\u00A0' : '│'}</span>
                        ))}
                        <span className="gantt-tree-branch">{isLast ? '└' : '├'}</span>
                      </span>
                    )}
                    <span className="issue-key">{issue.key}</span>
                    <span className="gantt-sidebar-title">{issue.title}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '99px',
                      background: status?.color ?? '#6b7280',
                      color: 'white',
                      lineHeight: '1.4',
                      marginLeft: '8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {status?.name}
                  </span>
                </div>
              )
            })}
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
                    <div
                      key={h.key}
                      className={`gantt-header-cell${h.dayType ? ` gantt-header-${h.dayType}` : ''}`}
                      style={{ width: h.span * cellWidth }}
                    >
                      {h.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* グリッド列（日表示時） */}
              {viewMode === 'day' && (
                <div className="gantt-grid-columns">
                  {dayTypes.map((dt, i) => (
                    <div
                      key={i}
                      className={`gantt-grid-col${dt !== 'weekday' ? ` gantt-grid-${dt}` : ''}`}
                      style={{ left: i * cellWidth, width: cellWidth }}
                    />
                  ))}
                </div>
              )}

              {/* 今日の線 */}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div className="gantt-today" style={{ left: todayOffset * cellWidth + cellWidth / 2 }} />
              )}

              {/* バー行 */}
              {flatList.map(({ issue }) => {
                if (!issue.startDate || !issue.dueDate) return null;

                const status = project.issueStatuses.find((s) => s.id === issue.statusId);

                const bar = getBarStyle(issue.startDate, issue.dueDate);

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
