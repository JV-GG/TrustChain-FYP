import React from 'react';
import { Link } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';
import { Progress, BlockedIcon } from './ui';
import { ethFromWei, isGoalReached, percentFunded, shortAddr } from '../lib/format';

export default function CampaignCard({ camp, vData, showDescription = true }) {
  const percent = percentFunded(camp.raisedAmount, camp.goalAmount);
  const reached = isGoalReached(camp.raisedAmount, camp.goalAmount);
  const flagged = vData?.badge === 'FLAGGED';

  return (
    <Link
      to={`/campaigns/${camp.id}`}
      className="card card-link flex flex-col gap-4 p-[22px] no-underline text-[var(--ink)]"
    >
      <div className="flex justify-between items-center gap-2">
        <span className="mono text-xs text-[var(--ink-3)] truncate">
          #{String(camp.id).padStart(2, '0')} · {shortAddr(camp.owner)}
        </span>
        {vData ? (
          <VerificationBadge badge={vData.badge} score={vData.score} reason={vData.reason} />
        ) : (
          <span className="skeleton h-[22px] w-24 rounded-full" aria-label="Checking creator wallet" />
        )}
      </div>

      <div className={`flex flex-col gap-1.5 ${showDescription ? 'min-h-[76px]' : 'min-h-[50px]'}`}>
        <span className="text-lg font-semibold tracking-[-0.02em] leading-snug line-clamp-2">{camp.title}</span>
        {showDescription && (
          <span className="text-sm leading-normal text-[var(--ink-2)] line-clamp-2">{camp.description}</span>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <Progress percent={percent} tone={flagged ? 'flagged' : undefined} />
        <div className="flex justify-between text-sm gap-3">
          <span>
            <strong className="font-semibold">{ethFromWei(camp.raisedAmount)} ETH</strong>{' '}
            <span className="text-[var(--ink-3)]">of {ethFromWei(camp.goalAmount, 2)}</span>
          </span>
          <span className="text-[var(--ink-3)]">
            {!camp.isActive ? 'Closed' : reached ? 'Goal reached' : `${percent}%`}
          </span>
        </div>
      </div>

      {flagged && camp.isActive && (
        <span className="text-[13px] text-[var(--red)] font-medium flex items-center gap-1.5">
          <BlockedIcon size={14} />
          Donations blocked
        </span>
      )}
    </Link>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className="card p-[22px] flex flex-col gap-4" aria-hidden="true">
      <div className="flex justify-between">
        <span className="skeleton h-4 w-28" />
        <span className="skeleton h-[22px] w-24 rounded-full" />
      </div>
      <span className="skeleton h-5 w-3/4" />
      <span className="skeleton h-10 w-full" />
      <span className="skeleton h-1.5 w-full" />
    </div>
  );
}
