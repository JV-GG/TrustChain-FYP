import React from 'react';

export function CheckIcon({ size = 16, className = '', strokeWidth = 2.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function AlertIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5v.5" />
    </svg>
  );
}

export function BlockedIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

export function ArrowIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-[var(--ink-3)] shrink-0">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal four-band scale with a marker at the score. */
export function RiskScale({ score, labels = 'numbers' }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="flex flex-col gap-2" role="img" aria-label={`Risk score ${clamped} out of 100`}>
      <div className="relative grid gap-[3px] h-2" style={{ gridTemplateColumns: '26fr 25fr 25fr 24fr' }}>
        <span className="rounded-l bg-[var(--accent)]" />
        <span className="bg-[var(--amber-bar)]" />
        <span className="bg-[var(--neutral-bar)]" />
        <span className="rounded-r bg-[var(--red)]" />
        <span
          className="absolute -top-[5px] w-[3px] h-[18px] rounded-sm bg-[var(--ink)]"
          style={{ left: `calc(${clamped}% - 1.5px)` }}
        />
      </div>
      <div className={`grid gap-[3px] text-[var(--ink-3)] ${labels === 'numbers' ? 'mono text-[11px]' : 'text-xs'}`} style={{ gridTemplateColumns: '26fr 25fr 25fr 24fr' }} aria-hidden="true">
        {labels === 'numbers' ? (
          <>
            <span>0</span><span>26</span><span>51</span><span>76</span>
          </>
        ) : (
          <>
            <span>Verified</span><span>Caution</span><span>Unverified</span><span>Flagged</span>
          </>
        )}
      </div>
    </div>
  );
}

export function Progress({ percent, tone }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ transform: `scaleX(${Math.max(0, Math.min(100, percent)) / 100})`, background: tone === 'flagged' ? 'var(--red)' : undefined }} />
    </div>
  );
}

/** Row of figures separated by hairline rules; wraps on narrow screens. */
export function StatStrip({ items, className = '' }) {
  // Explicit column counts keep every row full, so the 1px gaps read as clean dividers at any width
  const cols = items.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <div className={`card overflow-hidden grid grid-cols-1 gap-px bg-[var(--rule-soft)] ${cols} ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="bg-[var(--surface)] px-6 py-5 flex flex-col gap-1">
          <span className="text-[13px] text-[var(--ink-3)]">{item.label}</span>
          <span className={`text-[26px] font-bold tracking-[-0.02em] ${item.accent ? 'text-[var(--accent)]' : ''}`}>
            {item.value}
            {item.unit && <span className={`text-[15px] ml-1 ${item.accent ? '' : 'text-[var(--ink-2)]'}`}>{item.unit}</span>}
          </span>
          {item.note && <span className="text-[13px] text-[var(--ink-3)]">{item.note}</span>}
        </div>
      ))}
    </div>
  );
}

const NOTICE_TONE = {
  error: 'bg-[var(--red-tint)] text-[var(--red)]',
  success: 'bg-[var(--accent-tint)] text-[var(--accent)]',
  pending: 'bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--rule)]',
  caution: 'bg-[var(--amber-tint)] text-[var(--amber)]',
};

export function Notice({ tone = 'pending', title, children }) {
  return (
    <div className={`rounded-[10px] p-4 text-sm leading-relaxed ${NOTICE_TONE[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      {title && <p className="font-semibold m-0">{title}</p>}
      {children && <div className={`${title ? 'mt-1' : ''} text-[var(--ink-body)]`}>{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="card px-6 py-14 text-center flex flex-col items-center gap-3">
      <h3 className="h3">{title}</h3>
      {children && <p className="lead max-w-md">{children}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
