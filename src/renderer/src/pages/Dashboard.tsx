import { useAuth } from '@renderer/auth/useAuth';
import { OnboardStudent } from './OnboardStudent';

export function Dashboard(): JSX.Element {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <strong>ShulePay Admin</strong>
        <span className="spacer" />
        <span className="muted">{user?.name ?? user?.role}</span>
        <button className="link" onClick={() => void logout()}>Sign out</button>
      </header>
      <main className="content">
        <OnboardStudent />
      </main>
    </div>
  );
}
