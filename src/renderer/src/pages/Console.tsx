import { useState } from 'react';
import { Sidebar } from '@renderer/components/Sidebar';
import { NAV_ITEMS, type View } from '@renderer/components/nav';
import { useAuth } from '@renderer/auth/useAuth';
import { Overview } from './Overview';
import { Students } from './Students';
import { Onboard } from './Onboard';
import { Staff } from './Staff';
import { Transactions } from './Transactions';

function NoOrg(): JSX.Element {
  return (
    <div className="card">
      <div className="card-body muted">
        Your account isn't linked to a school. Ask a super-admin to scope your admin to an
        organization.
      </div>
    </div>
  );
}

export function Console(): JSX.Element {
  const { me } = useAuth();
  const [view, setView] = useState<View>('overview');
  const title = NAV_ITEMS.find((i) => i.view === view)?.title ?? '';
  const orgId = me?.orgId ?? null;

  return (
    <div className="shell">
      <Sidebar active={view} onNavigate={setView} />
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <span className="spacer" />
        </header>
        <div className="content">
          <div className="content-inner">
            {!orgId ? (
              <NoOrg />
            ) : view === 'overview' ? (
              <Overview orgId={orgId} onNavigate={setView} />
            ) : view === 'students' ? (
              <Students orgId={orgId} />
            ) : view === 'onboard' ? (
              <Onboard orgId={orgId} />
            ) : view === 'staff' ? (
              <Staff orgId={orgId} />
            ) : (
              <Transactions orgId={orgId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
