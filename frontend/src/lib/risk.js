/** Wraps a 0–100 score into the four bands the verifier uses. */
export function bandForScore(score) {
  if (score >= 76) return 'FLAGGED';
  if (score >= 51) return 'UNVERIFIED';
  if (score >= 26) return 'CAUTION';
  return 'VERIFIED';
}

export const BAND = {
  VERIFIED: { label: 'Verified', tone: 'tone-verified', color: 'var(--accent)' },
  CAUTION: { label: 'Caution', tone: 'tone-caution', color: 'var(--amber)' },
  UNVERIFIED: { label: 'Unverified', tone: 'tone-unverified', color: 'var(--ink-2)' },
  FLAGGED: { label: 'Flagged', tone: 'tone-flagged', color: 'var(--red)' },
};

/** Parses the risk engine's "+25 Risk" impact string into points. */
export function signalPoints(signal) {
  const match = /([+-]?\d+)/.exec(signal?.impact || '');
  return match ? Number(match[1]) : 0;
}
