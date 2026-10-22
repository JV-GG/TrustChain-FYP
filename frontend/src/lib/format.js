import { formatEther } from 'viem';

/** 0x4f2a9e…b791c3 style address/hash shortening. */
export function shortAddr(value, head = 6, tail = 4) {
  if (!value) return '';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Wei (bigint) → fixed-decimal ETH string. */
export function ethFromWei(wei, decimals = 4) {
  try {
    return Number(formatEther(wei ?? 0n)).toFixed(decimals);
  } catch {
    return (0).toFixed(decimals);
  }
}

/** Percent funded, capped at 100, computed in bigint so large goals stay exact. */
export function percentFunded(raisedWei, goalWei) {
  const goal = goalWei ?? 0n;
  const raised = raisedWei ?? 0n;
  if (goal <= 0n) return 0;
  const pct = Number((raised * 100n) / goal);
  return Math.min(100, pct);
}

export function isGoalReached(raisedWei, goalWei) {
  const goal = goalWei ?? 0n;
  return goal > 0n && (raisedWei ?? 0n) >= goal;
}

/** "1 donation", "3 donations". */
export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function timeAgo(dateInput) {
  if (!dateInput) return '';
  const diffMin = Math.floor((Date.now() - new Date(dateInput).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export function formatDate(dateInput) {
  if (!dateInput) return '';
  return new Date(dateInput).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
