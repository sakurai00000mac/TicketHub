import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { ProjectLayout } from './components/Layout/ProjectLayout';
import { ProjectList } from './pages/ProjectList';
import { IssuesPage } from './pages/IssuesPage';
import { IssueNewPage } from './pages/IssueNewPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { BoardPage } from './pages/BoardPage';
import { GanttPage } from './pages/GanttPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { WikiPage } from './pages/WikiPage';
import { PageView } from './pages/PageView';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { SettingsPage } from './pages/SettingsPage';

function WikiIndex() {
  return (
    <div className="empty-state">
      <h2>ページを選択してください</h2>
      <p>サイドバーからページを選択するか、新しいページを作成してください。</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Routes>
          <Route path="/" element={<><Header /><main className="main-content"><ProjectList /></main></>} />

          <Route path="/projects/:projectId" element={<><Header /><div className="app-body"><ProjectLayout /></div></>}>
            <Route index element={<Navigate to="issues" replace />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="issues/new" element={<IssueNewPage />} />
            <Route path="issues/:issueId" element={<IssueDetailPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="gantt" element={<GanttPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="wiki" element={<WikiPage />}>
              <Route index element={<WikiIndex />} />
              <Route path=":pageId" element={<PageView />} />
              <Route path=":pageId/edit" element={<MarkdownEditor />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
