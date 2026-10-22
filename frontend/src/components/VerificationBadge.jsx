import React from 'react';
import { CheckIcon } from './ui';
import { BAND } from '../lib/risk';

/**
 * Trust badge pill: "Verified · 10".
 *
 * Props:
 * - badge: 'VERIFIED' | 'CAUTION' | 'UNVERIFIED' | 'FLAGGED'
 * - score: number (0-100), shown after the label when present
 * - reason: string, used as the hover title
 * - size: 'sm' | 'lg'
 */
export default function VerificationBadge({ badge = 'UNVERIFIED', score, reason, size = 'sm' }) {
  const band = BAND[badge] || BAND.UNVERIFIED;
  const showScore = typeof score === 'number';

  return (
    <span
      className={`badge ${band.tone} ${size === 'lg' ? 'text-[13px] px-3 py-[5px]' : ''}`}
      title={reason || band.label}
    >
      {badge === 'VERIFIED' && <CheckIcon size={size === 'lg' ? 13 : 12} strokeWidth={3} />}
      {band.label}
      {showScore && <span>· {size === 'lg' ? `risk ${score}` : score}</span>}
    </span>
  );
}
