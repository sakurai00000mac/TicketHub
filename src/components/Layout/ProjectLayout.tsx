import { Outlet } from 'react-router-dom';
import { ProjectNav } from './ProjectNav';

export function ProjectLayout() {
  return (
    <div className="project-layout">
      <ProjectNav />
      <div className="project-main">
        <Outlet />
      </div>
    </div>
  );
}
