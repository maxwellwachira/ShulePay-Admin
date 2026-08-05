import { useState } from 'react';
import { Sidebar } from '@renderer/components/Sidebar';
import { NAV_ITEMS, type View } from '@renderer/components/nav';
import { useAuth } from '@renderer/auth/useAuth';
import { EmptyState } from '@renderer/components/ui';
import { IconStaff } from '@renderer/components/icons';
import { Overview } from './Overview';
import { Students } from './Students';
import { Onboard } from './Onboard';
import { Staff } from './Staff';
import { Transactions } from './Transactions';
import { Reports } from './Reports';
import { Terminals } from './Terminals';
import { Items } from './Items';
import { Settings } from './Settings';
import { Till } from '@renderer/pos/Till';

function NoOrg(): JSX.Element {
  return (
    <div className="card">
      <EmptyState
        icon={IconStaff}
        title="No school linked to this account"
        hint="Your sign-in works, but it isn't scoped to a school yet. Ask a ThumbPay super-admin to link your account to your organization."
      />
    </div>
  );
}

/** Forms read better narrow; data tables and dashboards want the full width. */
const NARROW_VIEWS: View[] = ['onboard', 'settings'];

export function Console(): JSX.Element {
  const { me } = useAuth();
  const [view, setView] = useState<View>('overview');
  const item = NAV_ITEMS.find((i) => i.view === view);
  const orgId = me?.orgId ?? null;

  // The till is not a page inside the console — it replaces it. A cashier on a busy
  // counter should have no sidebar to wander into and nothing to mis-tap.
  if (view === 'sell' && orgId) {
    return <Till orgId={orgId} onExit={() => setView('overview')} />;
  }

  return (
    <div className="shell">
      <Sidebar active={view} onNavigate={setView} />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{item?.title ?? ''}</h1>
            {item?.subtitle && <div className="topbar-sub">{item.subtitle}</div>}
          </div>
          <span className="spacer" />
          {me?.org?.name && <span className="chip">{me.org.name}</span>}
        </header>
        <div className="content">
          <div className={`content-inner ${NARROW_VIEWS.includes(view) ? 'narrow' : ''}`}>
            {!orgId ? (
              <NoOrg />
            ) : view === 'overview' ? (
              <Overview orgId={orgId} onNavigate={setView} />
            ) : view === 'students' ? (
              <Students orgId={orgId} onNavigate={setView} />
            ) : view === 'onboard' ? (
              <Onboard orgId={orgId} />
            ) : view === 'staff' ? (
              <Staff orgId={orgId} />
            ) : view === 'transactions' ? (
              <Transactions orgId={orgId} />
            ) : view === 'reports' ? (
              <Reports orgId={orgId} />
            ) : view === 'terminals' ? (
              <Terminals orgId={orgId} />
            ) : view === 'items' ? (
              <Items orgId={orgId} />
            ) : (
              <Settings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
