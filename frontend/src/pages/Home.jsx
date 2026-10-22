import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '../config/contract';
import { useCampaigns } from '../hooks/useCampaigns';
import CampaignCard, { CampaignCardSkeleton } from '../components/CampaignCard';
import VerificationBadge from '../components/VerificationBadge';
import { ArrowIcon, AlertIcon, CheckIcon, RiskScale } from '../components/ui';
import { signalPoints } from '../lib/risk';
import { isGoalReached, shortAddr } from '../lib/format';

const STEPS = [
  {
    title: "The creator's wallet is scored",
    body: 'Wallet age, transaction count, outflow ratio, recipient spread and a CryptoScamDB lookup add up to a score from 0 to 100.',
    code: 'analyseWallet(owner)',
  },
  {
    title: 'Your ETH is locked in escrow',
    body: 'Donations go to the contract, not the creator. A reentrancy guard stops the vault from being drained mid-call.',
    code: 'donate(campaignId)',
  },
  {
    title: 'Every payout is on the record',
    body: 'Creators withdraw in steps. Each disbursement emits an event anyone can trace on Etherscan or the audit page.',
    code: 'disburseFunds(campaignId, amount)',
  },
];

const BANDS = [
  { range: '0–25', badge: 'VERIFIED', text: 'Established history, healthy retention, no blacklist hits.' },
  { range: '26–50', badge: 'CAUTION', text: 'Open for donations. Read the signals before you give.' },
  { range: '51–75', badge: 'UNVERIFIED', text: 'Too little history to judge. Treat as unknown.' },
  { range: '76–100', badge: 'FLAGGED', text: 'Blacklisted or draining funds. Donations are blocked.' },
];

export default function Home() {
  const { campaigns, verifications, loading, count } = useCampaigns();

  const stats = useMemo(() => {
    const verified = Object.values(verifications).filter((v) => v?.badge === 'VERIFIED').length;
    const heldWei = campaigns.reduce((acc, c) => {
      const raised = c.raisedAmount ?? 0n;
      const out = c.disbursedAmount ?? 0n;
      return acc + (raised > out ? raised - out : 0n);
    }, 0n);
    return { verified, held: Number(formatEther(heldWei)) };
  }, [campaigns, verifications]);

  const open = campaigns.filter((c) => c.isActive && !isGoalReached(c.raisedAmount, c.goalAmount));
  const scoreOf = (c) => verifications[c.id]?.score ?? 101;
  const featured = [...open].sort((a, b) => scoreOf(a) - scoreOf(b)).slice(0, 3);

  // Hero shows a real report: the lowest-risk open campaign that has finished scoring
  const example = featured.find((c) => verifications[c.id]?.report);
  const exampleV = example ? verifications[example.id] : null;

  return (
    <>
      <section className="page grid items-center gap-14 pt-16 pb-16 sm:pt-[88px] sm:pb-[72px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))' }}>
        <div className="flex flex-col gap-6">
          <span className="eyebrow">Escrow crowdfunding · Ethereum Sepolia</span>
          <h1 className="display">Give to campaigns you can check first.</h1>
          <p className="lead text-lg max-w-[34rem]">
            TrustChain scores every creator's wallet before you donate, holds your ETH in a non-reentrant escrow contract, and records every payout as a public event.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/campaigns" className="btn btn-primary btn-lg">
              Browse campaigns
              <ArrowIcon />
            </Link>
            <Link to="/check" className="btn btn-secondary btn-lg">
              Check a wallet
            </Link>
          </div>
        </div>

        <HeroReport campaign={example} verification={exampleV} loading={loading || featured.some((c) => !verifications[c.id])} />
      </section>

      <section aria-label="Platform figures" className="border-y border-[var(--rule)] bg-[var(--surface)]">
        <div className="page">
          {/* 1px gaps over a rule-coloured ground draw the dividers, so they stay right when cells stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--rule-soft)] -mx-4 sm:-mx-6">
            <Figure label="Registered campaigns" value={count} note="Read live from the contract" noteAccent />
            <Figure label="Passed risk audit" value={stats.verified} note="Score 25 or below" />
            <Figure label="Held in escrow" value={stats.held.toFixed(2)} unit="ETH" note="Across all vaults" />
            <div className="bg-[var(--surface)] py-7 px-4 sm:px-6 flex flex-col gap-1.5">
              <span className="text-[13px] text-[var(--ink-3)]">Escrow contract</span>
              <span className="mono text-[17px] font-medium pt-2.5 pb-1.5">{shortAddr(CONTRACT_ADDRESS, 8, 5)}</span>
              <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="link text-[13px]">
                Verified on Etherscan ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="page pt-24 pb-6 flex flex-col gap-10">
        <div className="flex flex-col gap-3 max-w-[40rem]">
          <span className="eyebrow">How a donation moves</span>
          <h2 className="h2">Three checks between your wallet and theirs.</h2>
        </div>
        <div className="grid gap-px bg-[var(--rule)] border border-[var(--rule)] rounded-2xl overflow-hidden" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
          {STEPS.map((step, i) => (
            <div key={step.code} className="bg-[var(--surface)] p-8 flex flex-col gap-3.5">
              <span className="mono text-[13px] text-[var(--ink-3)]">0{i + 1}</span>
              <h3 className="h3">{step.title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-[var(--ink-2)]">{step.body}</p>
              <code className="mono text-xs text-[var(--ink-2)] bg-[var(--surface-2)] px-2.5 py-2 rounded-md self-start">{step.code}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="page pt-20 pb-6 grid gap-12 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Reading the score</span>
          <h2 className="h2">Four bands. One rule: lower is safer.</h2>
          <p className="lead">The badge on every campaign comes straight from its creator's score. Flagged campaigns can't take donations.</p>
        </div>
        <div className="flex flex-col border-t border-[var(--rule)]">
          {BANDS.map((b) => (
            <div key={b.range} className="grid gap-x-4 gap-y-2 items-baseline py-[18px] border-b border-[var(--rule)] grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[72px_112px_minmax(0,1fr)]">
              <span className="mono text-sm text-[var(--ink-2)]">{b.range}</span>
              <span className="justify-self-start"><VerificationBadge badge={b.badge} /></span>
              <span className="col-span-2 sm:col-span-1 text-[15px] leading-normal">{b.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="page pt-24 pb-6 flex flex-col gap-7">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <h2 className="h2">Raising now</h2>
          <Link to="/campaigns" className="link text-[15px] py-3">All campaigns →</Link>
        </div>
        {loading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </div>
        ) : featured.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="lead">No campaigns are raising right now.</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
            {featured.map((c) => (
              <CampaignCard key={c.id} camp={c} vData={verifications[c.id]} showDescription={false} />
            ))}
          </div>
        )}
      </section>

      <section className="page py-24">
        <div className="rounded-[20px] p-8 sm:p-12 flex flex-wrap justify-between items-center gap-8 bg-[var(--invert-bg)] text-[var(--invert-ink)]">
          <div className="flex flex-col gap-3 max-w-[36rem]">
            <h2 className="m-0 text-[32px] leading-tight tracking-[-0.03em] font-bold">Raising funds? Your wallet history is your pitch.</h2>
            <p className="m-0 text-base leading-relaxed text-[var(--invert-ink-2)]">
              Deploy a campaign in one transaction. Donors see your risk score before they see your goal.
            </p>
          </div>
          <Link to="/create" className="btn btn-invert btn-lg">Launch a campaign</Link>
        </div>
      </section>
    </>
  );
}

function Figure({ label, value, unit, note, noteAccent }) {
  return (
    <div className="bg-[var(--surface)] py-7 px-4 sm:px-6 flex flex-col gap-1.5">
      <span className="text-[13px] text-[var(--ink-3)]">{label}</span>
      <span className="text-4xl font-bold tracking-[-0.03em]">
        {value}
        {unit && <span className="text-xl text-[var(--ink-2)] ml-1.5">{unit}</span>}
      </span>
      <span className={`text-[13px] ${noteAccent ? 'text-[var(--accent)] font-medium' : 'text-[var(--ink-3)]'}`}>{note}</span>
    </div>
  );
}

function HeroReport({ campaign, verification, loading }) {
  if (loading) {
    return (
      <div className="card-raised p-7 flex flex-col gap-5" aria-hidden="true">
        <span className="skeleton h-4 w-40" />
        <span className="skeleton h-6 w-3/4" />
        <span className="skeleton h-16 w-32" />
        <span className="skeleton h-2 w-full" />
        <span className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (!campaign || !verification) {
    return (
      <article aria-label="What the risk report checks" className="card-raised p-7 flex flex-col gap-5">
        <span className="mono text-xs text-[var(--ink-3)]">RISK REPORT · FIVE SIGNALS</span>
        <ul className="m-0 p-0 list-none flex flex-col border-t border-[var(--rule-soft)]">
          {['Wallet age', 'Transaction history', 'Outflow ratio', 'Recipient spread', 'CryptoScamDB'].map((name) => (
            <li key={name} className="flex items-center gap-2.5 py-3 border-b border-[var(--rule-soft)] text-sm">
              <CheckIcon className="text-[var(--accent)]" />
              {name}
            </li>
          ))}
        </ul>
        <RiskScale score={0} />
      </article>
    );
  }

  const report = verification.report;
  const held = (campaign.raisedAmount ?? 0n) - (campaign.disbursedAmount ?? 0n);

  return (
    <article aria-label={`Risk report for campaign ${campaign.id}`} className="card-raised p-7 flex flex-col gap-[22px]">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <span className="mono text-xs text-[var(--ink-3)]">CAMPAIGN #{String(campaign.id).padStart(2, '0')} · RISK REPORT</span>
        <VerificationBadge badge={verification.badge} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xl font-semibold tracking-[-0.02em]">{campaign.title}</span>
        <span className="mono text-[13px] text-[var(--ink-3)]">Creator {shortAddr(campaign.owner)}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-[64px] leading-[0.9] font-bold tracking-[-0.04em]">{verification.score}</span>
        <span className="text-sm text-[var(--ink-2)] pb-1.5">/ 100 risk score<br />lower is safer</span>
      </div>
      <RiskScale score={verification.score} />
      <ul className="m-0 p-0 list-none flex flex-col border-t border-[var(--rule-soft)]">
        {report.signals.map((s) => {
          const pts = signalPoints(s);
          return (
            <li key={s.name} className="flex justify-between gap-4 py-[11px] border-b border-[var(--rule-soft)] text-sm">
              <span className="flex items-center gap-2.5">
                {s.isWarning ? <AlertIcon className="text-[var(--amber)]" /> : <CheckIcon className="text-[var(--accent)]" />}
                {s.name}
              </span>
              <span className="mono text-[13px] text-[var(--ink-2)]">{pts > 0 ? `+${pts}` : '0'}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between items-center gap-3 flex-wrap text-sm">
        <span className="text-[var(--ink-2)]">
          <strong className="text-[var(--ink)] font-semibold">{Number(formatEther(held > 0n ? held : 0n)).toFixed(4)} ETH</strong> held in escrow
        </span>
        <Link to={`/audit/campaign/${campaign.id}`} className="link">Open audit trail →</Link>
      </div>
    </article>
  );
}
