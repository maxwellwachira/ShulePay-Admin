import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, pos, formatKes, type Product } from '@renderer/api/client';
import { SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { Modal } from '@renderer/components/Modal';
import { IconSearch, IconReceipt, IconFingerprint, IconRefresh } from '@renderer/components/icons';
import type { ReaderStatus, TerminalIdentity } from '@shared/bridge';
import { cartReducer, cartTotal, cartCount, type CartEntry } from './cart';
import { ChargeFlow } from './ChargeFlow';
import { PairDevice } from './PairDevice';

/**
 * Till mode. It takes over the whole window on purpose: a cashier works one screen all
 * day, at speed, often on a touch monitor, and every pixel of console chrome is a
 * mis-tap waiting to happen.
 *
 * The keyboard is the fast path — type to filter, Enter to add, F2 to charge — because
 * a queue moves faster than a mouse does.
 */
export function Till({ orgId, onExit }: { orgId: string; onExit: () => void }): JSX.Element {
  const [identity, setIdentity] = useState<TerminalIdentity | null | undefined>(undefined);
  const [reader, setReader] = useState<ReaderStatus | null>(null);
  const [entries, dispatch] = useReducer(cartReducer, []);
  const [query, setQuery] = useState('');
  const [charging, setCharging] = useState(false);
  const [switching, setSwitching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void window.thumbpay.terminal.identity().then(setIdentity);
    void window.thumbpay.fingerprint.status().then(setReader);
  }, []);

  const paired = identity != null;

  // The till reads the catalog with its OWN credential, so a shift can run on a device
  // whose signed-in user is a cashier with no admin rights.
  const catalog = useQuery({
    queryKey: ['pos-catalog', identity?.id],
    queryFn: () => pos.catalog(),
    enabled: paired,
  });

  // Best-effort: powers name search on the account-number fallback. Admin-only on the
  // backend, so a cashier session simply gets the account-number-only experience.
  const students = useQuery({
    queryKey: ['students', orgId],
    queryFn: () => api.listStudents(orgId),
    enabled: paired,
    retry: false,
  });

  const products = useMemo(() => catalog.data?.products ?? [], [catalog.data]);
  const total = cartTotal(entries);
  const count = cartCount(entries);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) || (p.category ?? '').toLowerCase().includes(term),
    );
  }, [products, query]);

  function addProduct(product: Product): void {
    dispatch({ type: 'add', product });
    setQuery('');
    searchRef.current?.focus();
  }

  // Global accelerators. They stay out of the way while the charge overlay is open —
  // that flow owns Enter and Escape once money is in play.
  useEffect(() => {
    if (charging) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (count > 0) setCharging(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (query) setQuery('');
        else if (count > 0) dispatch({ type: 'clear' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [charging, count, query]);

  if (identity === undefined) {
    return <div className="till-boot muted">Opening till…</div>;
  }

  if (!paired) {
    return <PairDevice orgId={orgId} onPaired={setIdentity} onCancel={onExit} />;
  }

  return (
    <div className="till">
      <header className="till-bar">
        <button
          className="till-bar-id"
          onClick={() => setSwitching(true)}
          title="Change which till this device is"
        >
          <span className="dot dot-active" aria-hidden="true" />
          <strong>{identity.label}</strong>
        </button>
        <span className="spacer" />
        <ReaderChip reader={reader} />
        <button
          className="icon-btn"
          onClick={() => void catalog.refetch()}
          aria-label="Refresh items"
          title="Refresh items"
        >
          <IconRefresh className="ic" />
        </button>
        <button className="btn btn-ghost" onClick={onExit}>
          Close till
        </button>
      </header>

      <div className="till-body">
        <section className="till-grid-pane" aria-label="Items">
          <div className="till-search">
            <IconSearch className="ic" />
            <input
              ref={searchRef}
              className="input"
              placeholder="Type to find an item, Enter to add"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the single best match — the fastest way to ring up a
                // known item without hunting for its tile.
                if (e.key === 'Enter' && filtered.length > 0) {
                  e.preventDefault();
                  const first = filtered[0];
                  if (first) addProduct(first);
                }
              }}
              autoFocus
            />
          </div>

          {catalog.isLoading ? (
            <SkeletonRows rows={6} />
          ) : catalog.isError ? (
            <ErrorState
              message="Could not load the item list for this till."
              onRetry={() => void catalog.refetch()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={IconReceipt}
              title="No items yet"
              hint="Add what the canteen sells under Items in the console, then reopen the till."
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={IconSearch} title={`Nothing matches “${query}”`} />
          ) : (
            <div className="till-grid">
              {filtered.map((p) => (
                <button key={p.id} className="till-tile" onClick={() => addProduct(p)}>
                  <span className="till-tile-name">{p.name}</span>
                  <span className="till-tile-price">{formatKes(p.priceCents)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="till-cart" aria-label="Current sale">
          <div className="till-cart-head">
            <h2>Sale</h2>
            {count > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'clear' })}>
                Clear
              </button>
            )}
          </div>

          <div className="till-cart-lines">
            {entries.length === 0 ? (
              <div className="till-cart-empty">
                <IconReceipt className="ic" aria-hidden="true" />
                <p>Tap an item to start a sale.</p>
              </div>
            ) : (
              entries.map((e) => <CartRow key={e.product.id} entry={e} dispatch={dispatch} />)
            )}
          </div>

          <div className="till-cart-foot">
            <div className="till-total">
              <span>Total</span>
              <strong>{formatKes(total)}</strong>
            </div>
            <button
              className="btn btn-primary btn-xl till-charge"
              disabled={count === 0}
              onClick={() => setCharging(true)}
            >
              <IconFingerprint className="ic" />
              Charge · F2
            </button>
          </div>
        </aside>
      </div>

      {charging && (
        <ChargeFlow
          entries={entries}
          totalCents={total}
          students={students.data?.members ?? null}
          onCancel={() => setCharging(false)}
          onComplete={() => {
            setCharging(false);
            dispatch({ type: 'clear' });
            setQuery('');
            searchRef.current?.focus();
          }}
          onRefreshCatalog={() => void catalog.refetch()}
          onNeedsPairing={() => setIdentity(null)}
        />
      )}

      {switching && (
        <Modal title="Change till" onClose={() => setSwitching(false)}>
          <p>
            This device is paired as <strong>{identity.label}</strong>. Unpairing forgets
            its key so you can set it up as a different till.
          </p>
          <div className="notice notice-warn">
            The old key cannot be recovered — the backend shows a terminal's key once. To
            come back to “{identity.label}”, you'd pair this device afresh under that name.
            Sales already rung up are unaffected.
          </div>
          {count > 0 && (
            <div className="notice notice-err">
              There {count === 1 ? 'is 1 item' : `are ${count} items`} in the current sale.
              Unpairing will discard it.
            </div>
          )}
          <div className="row" style={{ marginTop: 18 }}>
            <button
              className="btn btn-danger"
              onClick={() => {
                void window.thumbpay.terminal.unpair().then(() => {
                  dispatch({ type: 'clear' });
                  setSwitching(false);
                  setIdentity(null); // drops straight to the pairing screen
                });
              }}
            >
              Unpair this device
            </button>
            <button className="btn btn-ghost" onClick={() => setSwitching(false)}>
              Keep {identity.label}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CartRow({
  entry,
  dispatch,
}: {
  entry: CartEntry;
  dispatch: (action: { type: 'setQuantity'; productId: string; quantity: number }) => void;
}): JSX.Element {
  const { product, quantity } = entry;
  return (
    <div className="till-line">
      <div className="till-line-main">
        <span className="till-line-name">{product.name}</span>
        <span className="till-line-unit muted">{formatKes(product.priceCents)} each</span>
      </div>
      <div className="till-stepper">
        <button
          className="till-step"
          onClick={() => dispatch({ type: 'setQuantity', productId: product.id, quantity: quantity - 1 })}
          aria-label={`One fewer ${product.name}`}
        >
          −
        </button>
        <span className="till-qty" aria-label={`${quantity} ${product.name}`}>
          {quantity}
        </span>
        <button
          className="till-step"
          onClick={() => dispatch({ type: 'setQuantity', productId: product.id, quantity: quantity + 1 })}
          aria-label={`One more ${product.name}`}
        >
          +
        </button>
      </div>
      <span className="till-line-total mono">{formatKes(product.priceCents * quantity)}</span>
    </div>
  );
}

/** Reader health, always visible — a dead scanner should never be a surprise mid-sale. */
function ReaderChip({ reader }: { reader: ReaderStatus | null }): JSX.Element | null {
  if (!reader) return null;
  const tone = reader.connected ? (reader.simulated ? 'warn' : 'ok') : 'err';
  const text = reader.simulated
    ? 'Simulated reader'
    : reader.connected
      ? 'Reader ready'
      : 'No reader';
  return (
    <span className={`till-reader till-reader-${tone}`} title={reader.message ?? undefined}>
      <IconFingerprint className="ic" />
      {text}
    </span>
  );
}
