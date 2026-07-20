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
      bgSm: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      bgLg: 'bg-slate-900/80 border-emerald-500/40 text-emerald-300',
      headerBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      scoreColor: 'text-emerald-400',
      borderGlow: 'shadow-emerald-500/10',
    },
    CAUTION: {
      label: 'Proceed with Caution',
      icon: '⚠️',
      symbol: '!',
      bgSm: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      bgLg: 'bg-slate-900/80 border-amber-500/40 text-amber-300',
      headerBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      scoreColor: 'text-amber-400',
      borderGlow: 'shadow-amber-500/10',
    },
    UNVERIFIED: {
      label: 'Unverified Campaign',
      icon: '✗',
      symbol: '?',
      bgSm: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      bgLg: 'bg-slate-900/80 border-orange-500/40 text-orange-300',
      headerBg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      scoreColor: 'text-orange-400',
      borderGlow: 'shadow-orange-500/10',
    },
    FLAGGED: {
      label: 'Flagged — Do Not Donate',
      icon: '🚩',
      symbol: '✕',
      bgSm: 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-bold',
      bgLg: 'bg-slate-900/90 border-rose-500/50 text-rose-300',
      headerBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      scoreColor: 'text-rose-400',
      borderGlow: 'shadow-rose-500/20',
    },
  };

  const config = badgeConfig[badge] || badgeConfig.UNVERIFIED;

  // Compact size ("sm") - Inline pill badge
  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${config.bgSm}`}
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
      className={`p-5 rounded-2xl border ${config.bgLg} shadow-lg ${config.borderGlow} space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${config.headerBg}`}>
                {badge}
              </span>
              <span className="text-sm font-extrabold text-white">{config.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">TrustChain Automated Risk Audit</p>
          </div>
        </div>

        {typeof score === 'number' && (
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Risk Score</span>
            <span className={`text-xl font-black ${config.scoreColor}`}>{score}/100</span>
          </div>
        )}
      </div>

      {reason && (
        <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-medium">
          <span className="text-slate-400 font-semibold">Verification Note: </span>
          {reason}
        </p>
      )}
    </div>
  );
}
