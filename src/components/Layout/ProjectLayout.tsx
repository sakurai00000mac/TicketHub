import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ProjectNav } from './ProjectNav';
import { useIssueStore } from '../../stores/issueStore';
import { useWikiStore } from '../../stores/wikiStore';
import { useDocumentStore } from '../../stores/documentStore';

export function ProjectLayout() {
  const { projectId } = useParams();
  const subscribeToIssues = useIssueStore((s) => s.subscribeToProject);
  const unsubscribeFromIssues = useIssueStore((s) => s.unsubscribeFromProject);
  const subscribeToWiki = useWikiStore((s) => s.subscribeToProject);
  const unsubscribeFromWiki = useWikiStore((s) => s.unsubscribeFromProject);
  const subscribeToDocs = useDocumentStore((s) => s.subscribeToProject);
  const unsubscribeFromDocs = useDocumentStore((s) => s.unsubscribeFromProject);

  useEffect(() => {
    if (!projectId) return;

    subscribeToIssues(projectId);
    subscribeToWiki(projectId);
    subscribeToDocs(projectId);

    return () => {
      unsubscribeFromIssues(projectId);
      unsubscribeFromWiki(projectId);
      unsubscribeFromDocs(projectId);
    };
  }, [projectId, subscribeToIssues, unsubscribeFromIssues, subscribeToWiki, unsubscribeFromWiki, subscribeToDocs, unsubscribeFromDocs]);

  return (
    <div className="project-layout">
      <ProjectNav />
      <div className="project-main">
        <Outlet />
      </div>
    </div>
  );
}
