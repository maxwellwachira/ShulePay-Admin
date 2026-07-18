import { Logo } from './Logo';
import { useAuth } from '@renderer/auth/useAuth';
import { IconSignOut } from './icons';
import { NAV_ITEMS, type View } from './nav';

export function Sidebar({
  active,
  onNavigate,
}: {
  active: View;
  onNavigate: (v: View) => void;
}): JSX.Element {
  const { me, logout } = useAuth();
  const initials = (me?.name ?? me?.org?.name ?? 'S').trim().charAt(0).toUpperCase();

  const groups = ['School', 'Finance'] as const;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo size={34} />
      </div>

      <nav className="nav">
        {groups.map((group) => (
          <div key={group}>
            <div className="nav-label">{group}</div>
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  className={`nav-item ${active === item.view ? 'active' : ''}`}
                  onClick={() => onNavigate(item.view)}
                >
                  <Icon className="ic" /> {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="user">
          <div className="avatar">{initials}</div>
          <div className="user-meta">
            <span className="user-name">{me?.org?.name ?? 'School'}</span>
            <span className="user-role">{me?.name ?? me?.role}</span>
          </div>
        </div>
        <button className="nav-item" onClick={() => void logout()}>
          <IconSignOut className="ic" /> Sign out
        </button>
      </div>
    </aside>
  );
}
