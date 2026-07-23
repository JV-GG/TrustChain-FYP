import React from 'react';

/**
 * VerificationBadge Component
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
      icon: '🛡️',
      symbol: '✓',
      bgSm: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      bgLg: 'theme-card border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      headerBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
      scoreColor: 'text-emerald-600 dark:text-emerald-400',
    },
    CAUTION: {
      label: 'Proceed with Caution',
      icon: '⚠️',
      symbol: '!',
      bgSm: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      bgLg: 'theme-card border-amber-500/30 text-amber-700 dark:text-amber-300',
      headerBg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400',
      scoreColor: 'text-amber-600 dark:text-amber-400',
    },
    UNVERIFIED: {
      label: 'Unverified Campaign',
      icon: '🔍',
      symbol: '?',
      bgSm: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
      bgLg: 'theme-card border-[var(--border-color)] text-slate-700 dark:text-slate-300',
      headerBg: 'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300',
      scoreColor: 'text-slate-600 dark:text-slate-400',
    },
    FLAGGED: {
      label: 'Flagged — Do Not Donate',
      icon: '🚩',
      symbol: '✕',
      bgSm: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40 font-bold',
      bgLg: 'theme-card border-rose-500/40 text-rose-700 dark:text-rose-300',
      headerBg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400',
      scoreColor: 'text-rose-600 dark:text-rose-400',
    },
  };

  const config = badgeConfig[badge] || badgeConfig.UNVERIFIED;

  // Compact size ("sm") - Inline pill badge
  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bgSm}`}
        title={reason || config.label}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  // Large size ("lg") - Full detailed card
  return (
    <div
      className={`p-5 rounded-2xl border ${config.bgLg} shadow-sm space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${config.headerBg}`}>
                {badge}
              </span>
              <span className="text-sm font-extrabold text-[var(--text-primary)]">{config.label}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">TrustChain Automated Risk Audit</p>
          </div>
        </div>

        {typeof score === 'number' && (
          <div className="text-right">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold block">Risk Score</span>
            <span className={`text-xl font-extrabold ${config.scoreColor}`}>{score}/100</span>
          </div>
        )}
      </div>

      {reason && (
        <p className="text-xs text-[var(--text-secondary)] theme-inset p-3 rounded-xl border border-[var(--border-color)] leading-relaxed font-medium">
          <strong className="text-[var(--text-primary)] font-bold">Audit Analysis: </strong>{reason}
        </p>
      )}
    </div>
  );
}
