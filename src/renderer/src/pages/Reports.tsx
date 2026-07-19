import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatKes, type OrgTxn } from '@renderer/api/client';
import { SkeletonStat, SkeletonRows, ErrorState, EmptyState } from '@renderer/components/ui';
import { IconChart, IconReceipt, IconStudents, IconZap } from '@renderer/components/icons';

/* ----------------------------------------------------------------------------
   Reports & insights - computed client-side from the org's transaction feed.
   Charts follow the house dataviz rules: single brand hue for a single series,
   thin bars with rounded data-ends and a square baseline, hairline gridlines,
   values in text ink (never in the series color), hover tooltips on every mark.
---------------------------------------------------------------------------- */

const DAYS = 14;

interface DayBucket {
  key: string;
  label: string;
  spendCents: number;
  topupCents: number;
  count: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildDays(txns: OrgTxn[]): DayBucket[] {
  const buckets: DayBucket[] = [];
  const byKey = new Map<string, DayBucket>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const b: DayBucket = {
      key: dayKey(d),
      label: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
      spendCents: 0,
      topupCents: 0,
      count: 0,
    };
    buckets.push(b);
    byKey.set(b.key, b);
  }
  for (const t of txns) {
    const b = byKey.get(dayKey(new Date(t.createdAt)));
    if (!b) continue;
    b.count += 1;
    if (t.amountCents < 0) b.spendCents += -t.amountCents;
    else b.topupCents += t.amountCents;
  }
  return buckets;
}

/** Round a maximum up to a clean axis number (1/2/2.5/5 × 10^n). */
function niceMax(v: number): number {
  if (v <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * pow) return m * pow;
  }
  return 10 * pow;
}

function compactKes(cents: number): string {
  const kes = cents / 100;
  if (kes >= 1_000_000) return `${(kes / 1_000_000).toFixed(1)}M`;
  if (kes >= 1_000) return `${(kes / 1_000).toFixed(kes >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(kes)}`;
}

interface Tip {
  x: number;
  y: number;
  label: string;
  value: string;
  sub: string;
}

function SpendChart({ days }: { days: DayBucket[] }): JSX.Element {
  const wrap = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const W = 680;
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...days.map((d) => d.spendCents)));
  const band = innerW / DAYS;
  const barW = Math.min(24, band * 0.55);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  function showTip(e: React.MouseEvent<SVGElement>, d: DayBucket): void {
    const cont = wrap.current?.getBoundingClientRect();
    const bar = e.currentTarget.getBoundingClientRect();
    if (!cont) return;
    setTip({
      x: bar.left + bar.width / 2 - cont.left,
      y: bar.top - cont.top,
      label: d.label,
      value: formatKes(d.spendCents),
      sub: `${d.count} transaction${d.count === 1 ? '' : 's'}`,
    });
  }

  return (
    <div className="chart" ref={wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Daily spending over the last ${DAYS} days`}>
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line className="chart-grid-line" x1={pad.left} x2={W - pad.right} y1={y} y2={y} />
              <text className="chart-axis-text" x={pad.left - 8} y={y + 3.5} textAnchor="end">
                {compactKes(t)}
              </text>
            </g>
          );
        })}
        {days.map((d, i) => {
          const x = pad.left + i * band + (band - barW) / 2;
          const h = max === 0 ? 0 : (d.spendCents / max) * innerH;
          const y = pad.top + innerH - h;
          const r = Math.min(4, h);
          return (
            <g key={d.key}>
              {h > 0 && (
                <path
                  className="chart-bar-rect"
                  d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`}
                />
              )}
              {/* Full-band hit target so hover works even on tiny bars */}
              <rect
                x={pad.left + i * band}
                y={pad.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={(e) => showTip(e, d)}
                onMouseLeave={() => setTip(null)}
              />
              {i % 2 === 0 && (
                <text
                  className="chart-axis-text"
                  x={pad.left + i * band + band / 2}
                  y={H - 8}
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <div className="tip-label">{tip.label}</div>
          <div className="tip-value">{tip.value}</div>
          <div className="tip-label">{tip.sub}</div>
        </div>
      )}
    </div>
  );
}

export function Reports({ orgId }: { orgId: string }): JSX.Element {
  const txns = useQuery({ queryKey: ['txns', orgId], queryFn: () => api.transactions(orgId) });
  const students = useQuery({ queryKey: ['students', orgId], queryFn: () => api.listStudents(orgId) });

  const all = useMemo(() => txns.data?.transactions ?? [], [txns.data]);
  const days = useMemo(() => buildDays(all), [all]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = all.filter((t) => new Date(t.createdAt) >= weekAgo);
  const spentWeek = thisWeek.reduce((s, t) => s + (t.amountCents < 0 ? -t.amountCents : 0), 0);
  const toppedWeek = thisWeek.reduce((s, t) => s + (t.amountCents > 0 ? t.amountCents : 0), 0);
  const spendTxns = all.filter((t) => t.amountCents < 0);
  const avgSpend =
    spendTxns.length === 0
      ? 0
      : Math.round(spendTxns.reduce((s, t) => s + -t.amountCents, 0) / spendTxns.length);

  const byKind = useMemo(() => {
    const m = new Map<string, { cents: number; count: number }>();
    for (const t of all) {
      const e = m.get(t.kind) ?? { cents: 0, count: 0 };
      e.cents += Math.abs(t.amountCents);
      e.count += 1;
      m.set(t.kind, e);
    }
    return [...m.entries()].sort((a, b) => b[1].cents - a[1].cents);
  }, [all]);
  const maxKind = byKind[0]?.[1].cents ?? 0;

  const topStudents = useMemo(() => {
    const m = new Map<string, { name: string; accountNumber: string; cents: number; count: number }>();
    for (const t of spendTxns) {
      const e = m.get(t.accountNumber) ?? {
        name: t.memberName,
        accountNumber: t.accountNumber,
        cents: 0,
        count: 0,
      };
      e.cents += -t.amountCents;
      e.count += 1;
      m.set(t.accountNumber, e);
    }
    return [...m.values()].sort((a, b) => b.cents - a.cents).slice(0, 5);
  }, [spendTxns]);

  if (txns.isError) {
    return (
      <div className="card">
        <ErrorState onRetry={() => void txns.refetch()} />
      </div>
    );
  }

  const loading = txns.isLoading;

  return (
    <div className="stack">
      {loading ? (
        <div className="stat-row four">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      ) : (
        <div className="stat-row four">
          <div className="stat">
            <div className="stat-label">
              <IconZap className="ic" /> Spent this week
            </div>
            <div className="stat-value">{formatKes(spentWeek)}</div>
            <div className="stat-sub">purchases in the last 7 days</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <IconReceipt className="ic" /> Topped up this week
            </div>
            <div className="stat-value">{formatKes(toppedWeek)}</div>
            <div className="stat-sub">loaded by guardians</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <IconChart className="ic" /> Average purchase
            </div>
            <div className="stat-value">{formatKes(avgSpend)}</div>
            <div className="stat-sub">across {spendTxns.length} purchases</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <IconStudents className="ic" /> Students
            </div>
            <div className="stat-value">{students.data?.count ?? '–'}</div>
            <div className="stat-sub">onboarded</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Daily spending (last {DAYS} days)</h2>
          <p>What students spent at your terminals each day, in KES.</p>
        </div>
        <div className="card-body">
          {loading ? (
            <SkeletonRows rows={4} />
          ) : all.length === 0 ? (
            <EmptyState
              icon={IconChart}
              title="No data to chart yet"
              hint="Once students start paying, daily spending will show up here."
            />
          ) : (
            <SpendChart days={days} />
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Volume by type</h2>
            <p>Where the money moved, by transaction type.</p>
          </div>
          <div className="card-body">
            {loading ? (
              <SkeletonRows rows={3} />
            ) : byKind.length === 0 ? (
              <div className="empty">Nothing yet.</div>
            ) : (
              byKind.map(([kind, v]) => (
                <div key={kind} className="hbar-row">
                  <span className="hbar-label">{kind}</span>
                  <div className="hbar-track">
                    <div
                      className="hbar-fill"
                      style={{ width: `${maxKind === 0 ? 0 : Math.max(2, (v.cents / maxKind) * 100)}%` }}
                    />
                  </div>
                  <span className="hbar-value">
                    {formatKes(v.cents)} · {v.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Top spenders</h2>
            <p>Students with the highest purchases. Useful for spotting outliers.</p>
          </div>
          {loading ? (
            <SkeletonRows rows={4} />
          ) : topStudents.length === 0 ? (
            <div className="empty">No purchases yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="right">Purchases</th>
                    <th className="right">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topStudents.map((s) => (
                    <tr key={s.accountNumber}>
                      <td>
                        <div className="strong">{s.name}</div>
                        <div className="mono">{s.accountNumber}</div>
                      </td>
                      <td className="right mono">{s.count}</td>
                      <td className="right strong">{formatKes(s.cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
