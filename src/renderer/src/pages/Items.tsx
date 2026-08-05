import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, formatKes, type Product } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';
import { SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { IconReceipt, IconRefresh } from '@renderer/components/icons';

/** Shillings in the form, cents on the wire — nobody types "2000" for a chapati. */
function parseKes(input: string): number | null {
  const value = Number(input.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return cents > 0 ? cents : null;
}

export function Items({ orgId }: { orgId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const [showArchived, setShowArchived] = useState(false);

  const q = useQuery({
    queryKey: ['products', orgId, showArchived],
    queryFn: () => api.listProducts(orgId, showArchived),
  });

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ['products', orgId] });
    // The till reads its own copy through the terminal credential; drop that too so a
    // price change is one refresh away rather than a restart.
    void qc.invalidateQueries({ queryKey: ['pos-catalog'] });
  };

  const create = useMutation({
    mutationFn: (body: { name: string; priceCents: number }) => api.createProduct(orgId, body),
    onSuccess: (p) => {
      setName('');
      setPrice('');
      setErrors({});
      toast.push('ok', `“${p.name}” added at ${formatKes(p.priceCents)}`);
      invalidate();
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Could not add the item'),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateProduct>[2] }) =>
      api.updateProduct(orgId, id, patch),
    onSuccess: () => invalidate(),
    onError: (e) =>
      toast.push('err', e instanceof ApiError ? e.message : 'Could not update the item'),
  });

  function submit(e: FormEvent): void {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give the item a name.';
    const priceCents = parseKes(price);
    if (priceCents === null) next.price = 'Enter a price in shillings, e.g. 20 or 12.50.';
    setErrors(next);
    if (Object.keys(next).length === 0 && priceCents !== null) {
      create.mutate({ name: name.trim(), priceCents });
    }
  }

  const products = q.data?.products ?? [];

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Add an item</h2>
          <p>
            Whatever the canteen sells. Items appear as buttons on every till, so keep the
            names short enough to read at a glance.
          </p>
        </div>
        <div className="card-body">
          <form className="row" onSubmit={submit} style={{ alignItems: 'flex-end' }} noValidate>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="item-name">Item name</label>
              <input
                id="item-name"
                className={`input ${errors.name ? 'invalid' : ''}`}
                placeholder="Chapati"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="item-price">Price (KES)</label>
              <input
                id="item-price"
                className={`input ${errors.price ? 'invalid' : ''}`}
                placeholder="20"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {errors.price && <span className="field-error">{errors.price}</span>}
            </div>
            <button className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add item'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head row">
          <h2>Price list</h2>
          <span className="spacer" />
          <label className="checkbox" style={{ marginRight: 12 }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span>Show archived</span>
          </label>
          <button
            className="icon-btn"
            onClick={() => void q.refetch()}
            aria-label="Refresh"
            title="Refresh"
          >
            <IconRefresh className="ic" />
          </button>
        </div>

        {q.isLoading ? (
          <SkeletonRows rows={4} />
        ) : q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={IconReceipt}
            title="Nothing on the price list yet"
            hint="Add your first item above — chapati, soda, mandazi, whatever sells."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <ItemRow
                    key={p.id}
                    product={p}
                    busy={update.isPending}
                    onPrice={(priceCents) => update.mutate({ id: p.id, patch: { priceCents } })}
                    onToggleArchive={() =>
                      update.mutate({
                        id: p.id,
                        patch: { status: p.status === 'active' ? 'archived' : 'active' },
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({
  product,
  busy,
  onPrice,
  onToggleArchive,
}: {
  product: Product;
  busy: boolean;
  onPrice: (priceCents: number) => void;
  onToggleArchive: () => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((product.priceCents / 100).toString());

  function commit(): void {
    const cents = parseKes(draft);
    if (cents !== null && cents !== product.priceCents) onPrice(cents);
    setEditing(false);
  }

  const archived = product.status === 'archived';

  return (
    <tr className={archived ? 'row-muted' : ''}>
      <td className="strong">{product.name}</td>
      <td>
        {editing ? (
          <input
            className="input input-sm"
            style={{ width: 90 }}
            value={draft}
            inputMode="decimal"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft((product.priceCents / 100).toString());
                setEditing(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button className="linkish mono" onClick={() => setEditing(true)} disabled={busy}>
            {formatKes(product.priceCents)}
          </button>
        )}
      </td>
      <td>
        <span className={`dot ${archived ? 'dot-idle' : 'dot-active'}`} />{' '}
        <span className="kind">{archived ? 'archived' : 'on sale'}</span>
      </td>
      <td style={{ textAlign: 'right' }}>
        <button className="btn btn-secondary btn-sm" onClick={onToggleArchive} disabled={busy}>
          {archived ? 'Put back on sale' : 'Archive'}
        </button>
      </td>
    </tr>
  );
}
