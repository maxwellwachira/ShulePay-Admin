import { Sidebar } from '@renderer/components/Sidebar';
import { OnboardStudent } from './OnboardStudent';

export function Dashboard(): JSX.Element {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <h1>Onboarding</h1>
          <span className="spacer" />
        </header>
        <div className="content">
          <div className="content-inner">
            <OnboardStudent />
          </div>
        </div>
      </div>
    </div>
  );
}
