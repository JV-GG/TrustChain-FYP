import React from 'react';

/**
 * VerificationBadge Component (Apple Design Edition)
 * Displays campaign trust status badges (VERIFIED, CAUTION, UNVERIFIED, FLAGGED)
 *
 * Props:
 * - badge: 'VERIFIED' | 'CAUTION' | 'UNVERIFIED' | 'FLAGGED'
 * - score: number (0-100)
 * - reason: string
 * - size: 'sm' | 'lg'
 */
export default function VerificationBadge({ badge = 'UNVERIFIED', score, reason, size = 'sm' }) {
  const badgeConfig = {
    VERIFIED: {
      label: 'Verified Campaign',
      symbol: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      ),
      lgIcon: (
        <div className="w-10 h-10 rounded-2xl bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)] flex items-center justify-center shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
      ),
      bgSm: 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] border-[var(--apple-green-border)]',
      bgLg: 'apple-glass border-[var(--apple-green-border)]',
      headerBg: 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] border-[var(--apple-green-border)]',
      scoreColor: 'text-[var(--apple-green)]',
    },
    CAUTION: {
      label: 'Proceed with Caution',
      symbol: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      lgIcon: (
        <div className="w-10 h-10 rounded-2xl bg-[var(--apple-amber-tint)] text-[var(--apple-amber)] border border-[var(--apple-amber-border)] flex items-center justify-center shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      ),
      bgSm: 'bg-[var(--apple-amber-tint)] text-[var(--apple-amber)] border-[var(--apple-amber-border)]',
      bgLg: 'apple-glass border-[var(--apple-amber-border)]',
      headerBg: 'bg-[var(--apple-amber-tint)] text-[var(--apple-amber)] border-[var(--apple-amber-border)]',
      scoreColor: 'text-[var(--apple-amber)]',
    },
    UNVERIFIED: {
      label: 'Unverified Campaign',
      symbol: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      lgIcon: (
        <div className="w-10 h-10 rounded-2xl bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border-color)] flex items-center justify-center shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      ),
      bgSm: 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-color)]',
      bgLg: 'apple-glass border-[var(--border-color)]',
      headerBg: 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-color)]',
      scoreColor: 'text-[var(--text-muted)]',
    },
    FLAGGED: {
      label: 'Flagged — High Risk',
      symbol: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
      ),
      lgIcon: (
        <div className="w-10 h-10 rounded-2xl bg-[var(--apple-red-tint)] text-[var(--apple-red)] border border-[var(--apple-red-border)] flex items-center justify-center shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </div>
      ),
      bgSm: 'bg-[var(--apple-red-tint)] text-[var(--apple-red)] border-[var(--apple-red-border)] font-bold',
      bgLg: 'apple-glass border-[var(--apple-red-border)]',
      headerBg: 'bg-[var(--apple-red-tint)] text-[var(--apple-red)] border-[var(--apple-red-border)]',
      scoreColor: 'text-[var(--apple-red)]',
    },
  };

  const config = badgeConfig[badge] || badgeConfig.UNVERIFIED;

  // Compact size ("sm") - Inline pill badge
  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.bgSm} backdrop-blur-md shadow-xs`}
        title={reason || config.label}
      >
        <span>{config.symbol}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  // Large size ("lg") - Full detailed card
  return (
    <div className={`p-5 rounded-2xl border ${config.bgLg} shadow-md space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.lgIcon}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${config.headerBg}`}>
                {badge}
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{config.label}</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">TrustChain On-Chain Risk Engine</p>
          </div>
        </div>

        {typeof score === 'number' && (
          <div className="text-right">
            <span className="caption-label text-[var(--text-muted)] block">Risk Score</span>
            <span className={`text-xl font-extrabold ${config.scoreColor}`}>{score}/100</span>
          </div>
        )}
      </div>

      {reason && (
        <div className="text-xs text-[var(--text-secondary)] apple-inset p-3.5 rounded-xl border border-[var(--border-subtle)] leading-relaxed font-normal">
          <strong className="text-[var(--text-primary)] font-semibold">Audit Analysis: </strong>{reason}
        </div>
      )}
    </div>
  );
}
