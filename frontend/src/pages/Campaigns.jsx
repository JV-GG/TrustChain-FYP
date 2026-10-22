import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { useCampaigns } from '../hooks/useCampaigns';
import CampaignCard, { CampaignCardSkeleton, LaunchTile } from '../components/CampaignCard';
import VerificationBadge from '../components/VerificationBadge';
import { EmptyState, PlusIcon, SearchIcon, StatStrip } from '../components/ui';
import { ethFromWei, isGoalReached } from '../lib/format';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'MY_CAMPAIGNS', label: 'Mine' },
  { id: 'ACTIVE', label: 'Raising' },
  { id: 'VERIFIED', label: 'Verified only' },
  { id: 'GOAL_REACHED', label: 'Goal reached' },
  { id: 'FLAGGED', label: 'Flagged' },
];

const GRID = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' };

export default function Campaigns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFilter = searchParams.get('filter');
  const { address: userAddress } = useAccount();
  const [filter, setFilter] = useState(queryFilter || 'ALL');
  const [search, setSearch] = useState('');
  const { campaigns, verifications, loading } = useCampaigns();

  useEffect(() => {
    if (queryFilter) setFilter(queryFilter);
  }, [queryFilter]);

  const pickFilter = (id) => {
    setFilter(id);
    setSearchParams(id === 'ALL' ? {} : { filter: id }, { replace: true });
  };

  const isMine = (c) => Boolean(userAddress) && c.owner.toLowerCase() === userAddress.toLowerCase();
  const isRaising = (c) => c.isActive && !isGoalReached(c.raisedAmount, c.goalAmount);

  const tests = {
    ALL: () => true,
    MY_CAMPAIGNS: isMine,
    ACTIVE: isRaising,
    VERIFIED: (c) => verifications[c.id]?.badge === 'VERIFIED',
    GOAL_REACHED: (c) => isGoalReached(c.raisedAmount, c.goalAmount),
    FLAGGED: (c) => verifications[c.id]?.badge === 'FLAGGED',
  };

  const q = search.trim().toLowerCase();
  const searched = campaigns.filter(
    (c) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q)
  );
  const filtered = searched.filter(tests[filter] || tests.ALL);
  const raising = filtered.filter(isRaising);
  const closed = filtered.filter((c) => !isRaising(c));

  const mine = campaigns.filter(isMine);
  const sumEth = (key) => mine.reduce((acc, c) => acc + Number(formatEther(c[key] || 0n)), 0);
  const myRaised = sumEth('raisedAmount');
  const myDisbursed = sumEth('disbursedAmount');

  return (
    <div className="page pt-14 pb-24 flex flex-col gap-8">
      <div className="flex justify-between items-end gap-5 flex-wrap">
        <div className="flex flex-col gap-2.5">
          <h1 className="h1">{filter === 'MY_CAMPAIGNS' ? 'Your campaigns' : 'Campaigns'}</h1>
          <p className="lead">Every campaign is a vault on the escrow contract. Badges come from the creator's wallet score.</p>
        </div>
        <Link to="/create" className="btn btn-primary btn-lg">
          <PlusIcon />
          Launch campaign
        </Link>
      </div>

      {userAddress && (mine.length > 0 || filter === 'MY_CAMPAIGNS') && (
        <section aria-label="Your wallet" className="flex flex-col gap-2">
          <StatStrip
            items={[
              { label: 'Your campaigns', value: mine.length },
              { label: 'Total received', value: myRaised.toFixed(4), unit: 'ETH' },
              { label: 'Disbursed', value: myDisbursed.toFixed(4), unit: 'ETH' },
              { label: 'Still in vault', value: Math.max(0, myRaised - myDisbursed).toFixed(4), unit: 'ETH', accent: true },
            ]}
          />
          <Link to={`/audit/${userAddress}`} className="link text-sm self-end py-2">Audit your wallet →</Link>
        </section>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div role="group" aria-label="Filter campaigns" className="seg">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => pickFilter(f.id)}
              className="seg-item"
            >
              {f.label}{' '}
              {!loading && <span className="text-[var(--ink-3)] font-normal">{searched.filter(tests[f.id]).length}</span>}
            </button>
          ))}
        </div>
        <label className="field-group flex-[0_1_420px] min-w-[240px]">
          <SearchIcon />
          <span className="sr-only">Search campaigns</span>
          <input type="search" placeholder="Search by title or 0x address" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4" style={GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      ) : filter === 'MY_CAMPAIGNS' && !userAddress ? (
        <EmptyState title="Connect a wallet to see your campaigns" action={<ConnectWalletButton />}>
          Campaigns are listed by the wallet that created them.
        </EmptyState>
      ) : filter === 'MY_CAMPAIGNS' && filtered.length === 0 ? (
        <EmptyState
          title="You haven't launched a campaign yet"
          action={<Link to="/create" className="btn btn-primary">Launch your first campaign</Link>}
        >
          Nothing on the contract was created by this wallet.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="No campaigns match">Try another filter or clear the search.</EmptyState>
      ) : (
        <>
          <section aria-label="Raising" className="flex flex-col gap-4">
            <h2 className="m-0 text-[15px] font-semibold text-[var(--ink-2)]">Raising · {raising.length}</h2>
            {raising.length === 0 && (
              <p className="m-0 text-sm text-[var(--ink-3)]">None in this view are raising right now.</p>
            )}
            <div className="grid gap-4" style={GRID}>
              {raising.map((c) => (
                <CampaignCard key={c.id} camp={c} vData={verifications[c.id]} />
              ))}
              {/* Fills the next free slot so a short row offers the obvious next step */}
              {['ALL', 'ACTIVE', 'MY_CAMPAIGNS'].includes(filter) && <LaunchTile />}
            </div>
          </section>

          {closed.length > 0 && (
            <section aria-label="Completed and closed" className="flex flex-col gap-4 pt-4">
              <h2 className="m-0 text-[15px] font-semibold text-[var(--ink-2)]">Completed and closed · {closed.length}</h2>
              <div className="card overflow-x-auto">
                <table className="ledger min-w-[640px]">
                  <thead>
                    <tr>
                      <th scope="col">Campaign</th>
                      <th scope="col">Badge</th>
                      <th scope="col" className="num">Raised</th>
                      <th scope="col" className="num">Disbursed</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closed.map((c) => {
                      const v = verifications[c.id];
                      return (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/campaigns/${c.id}`} className="font-semibold text-[var(--ink)] no-underline hover:underline">
                              {c.title}
                            </Link>
                          </td>
                          <td>{v ? <VerificationBadge badge={v.badge} score={v.score} /> : <span className="text-[var(--ink-3)]">—</span>}</td>
                          <td className="num">
                            {ethFromWei(c.raisedAmount)} / {ethFromWei(c.goalAmount, 2)} ETH
                          </td>
                          <td className="num">{ethFromWei(c.disbursedAmount)} ETH</td>
                          <td className="text-[var(--ink-2)]">{c.isActive ? 'Goal reached' : 'Closed by owner'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
