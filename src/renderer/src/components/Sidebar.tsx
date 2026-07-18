import { Logo } from './Logo';
import { useAuth } from '@renderer/auth/useAuth';
import { IconOnboard, IconStudents, IconTerminals, IconReconcile, IconSignOut } from './icons';

export function Sidebar(): JSX.Element {
  const { user, logout } = useAuth();
  const initials = (user?.name ?? 'Admin').trim().charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo size={34} />
      </div>

      <nav className="nav">
        <div className="nav-label">Manage</div>
        <button className="nav-item active">
          <IconOnboard className="ic" /> Onboarding
        </button>
        <button className="nav-item" disabled>
          <IconStudents className="ic" /> Students <span className="nav-soon">Soon</span>
        </button>
        <button className="nav-item" disabled>
          <IconTerminals className="ic" /> Terminals <span className="nav-soon">Soon</span>
        </button>

        <div className="nav-label">Finance</div>
        <button className="nav-item" disabled>
          <IconReconcile className="ic" /> Reconciliation <span className="nav-soon">Soon</span>
        </button>
      </nav>

      <div className="sidebar-foot">
        <div className="user">
          <div className="avatar">{initials}</div>
          <div className="user-meta">
            <span className="user-name">{user?.name ?? 'Administrator'}</span>
            <span className="user-role">{user?.role ?? 'admin'}</span>
          </div>
        </div>
        <button className="nav-item" onClick={() => void logout()}>
          <IconSignOut className="ic" /> Sign out
        </button>
      </div>
    </aside>
  );
}
