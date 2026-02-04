import { NavLink, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiColumns,
  FiBarChart2,
  FiFileText,
  FiBook,
  FiSettings,
  FiPlusCircle,
} from 'react-icons/fi';

const navItems = [
  { to: 'issues/new', label: '課題の作成', icon: FiPlusCircle },
  { to: 'issues', label: '課題', icon: FiAlertCircle },
  { to: 'board', label: 'ボード', icon: FiColumns },
  { to: 'gantt', label: 'ガントチャート', icon: FiBarChart2 },
  { to: 'documents', label: 'ドキュメント', icon: FiFileText },
  { to: 'wiki', label: 'Wiki', icon: FiBook },
  { to: 'settings', label: '設定', icon: FiSettings },
];

export function ProjectNav() {
  const { projectId } = useParams();

  if (!projectId) return null;

  return (
    <nav className="project-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={`/projects/${projectId}/${item.to}`}
          className={({ isActive }) =>
            `project-nav-item${isActive ? ' active' : ''}`
          }
          end={item.to === 'issues'}
        >
          <item.icon size={16} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
