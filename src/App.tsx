import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { ProjectLayout } from './components/Layout/ProjectLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ProjectList } from './pages/ProjectList';
import LoginPage from './pages/LoginPage';
import JoinProjectPage from './pages/JoinProjectPage';
import { IssuesPage } from './pages/IssuesPage';
import { IssueNewPage } from './pages/IssueNewPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { BoardPage } from './pages/BoardPage';
import { GanttPage } from './pages/GanttPage';
import { DocumentListPage } from './pages/DocumentListPage';
import { DocumentNewPage } from './pages/DocumentNewPage';
import { DocumentViewPage } from './pages/DocumentViewPage';
import { DocumentEditPage } from './pages/DocumentEditPage';
import { WikiPage } from './pages/WikiPage';
import { PageView } from './pages/PageView';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './stores/authStore';
import { useProjectStore } from './stores/projectStore';

function WikiIndex() {
  return (
    <div className="empty-state">
      <h2>ページを選択してください</h2>
      <p>サイドバーからページを選択するか、新しいページを作成してください。</p>
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const subscribeToProjects = useProjectStore((state) => state.subscribeToProjects);

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      subscribeToProjects(user.id);
    }
  }, [user, subscribeToProjects]);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/join" element={
            <ProtectedRoute>
              <Header />
              <main className="main-content"><JoinProjectPage /></main>
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <Header />
              <main className="main-content"><ProjectList /></main>
            </ProtectedRoute>
          } />

          <Route path="/projects/:projectId" element={
            <ProtectedRoute>
              <Header />
              <div className="app-body"><ProjectLayout /></div>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="issues" replace />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="issues/new" element={<IssueNewPage />} />
            <Route path="issues/:issueId" element={<IssueDetailPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="gantt" element={<GanttPage />} />
            <Route path="documents" element={<DocumentListPage />} />
            <Route path="documents/new" element={<DocumentNewPage />} />
            <Route path="documents/:documentId" element={<DocumentViewPage />} />
            <Route path="documents/:documentId/edit" element={<DocumentEditPage />} />
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
