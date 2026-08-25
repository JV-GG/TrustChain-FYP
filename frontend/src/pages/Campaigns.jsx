import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useReadContract, usePublicClient, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { useEthPrice, formatUsd } from '../hooks/useEthPrice';
import { verifyCampaign } from '../services/campaignVerifier';
import VerificationBadge from '../components/VerificationBadge';

export default function Campaigns() {
  const [searchParams] = useSearchParams();
  const queryFilter = searchParams.get('filter');

  const { address: userAddress } = useAccount();
  const [filter, setFilter] = useState(queryFilter || 'ALL'); // ALL, MY_CAMPAIGNS, ACTIVE, VERIFIED, GOAL_REACHED
  const [search, setSearch] = useState('');
  const [campaignsList, setCampaignsList] = useState([]);
  const [verificationsMap, setVerificationsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const { ethPrice } = useEthPrice();
  const publicClient = usePublicClient();

  // Sync state with URL search param if present
  useEffect(() => {
    if (queryFilter) {
      setFilter(queryFilter);
    }
  }, [queryFilter]);

  // Read campaignCount from smart contract
  const { data: countData, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCampaignCount',
  });

  const campaignCount = countData ? Number(countData) : 0;

  // Fast loading: fetch on-chain campaigns instantly, then load risk badges in parallel background
  useEffect(() => {
    async function fetchAllCampaigns() {
      if (!campaignCount || !publicClient) {
        setLoading(false);
        return;
      }

      try {
        const campaignPromises = [];
        for (let i = 1; i <= campaignCount; i++) {
          campaignPromises.push(
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getCampaign',
              args: [BigInt(i)],
            })
          );
        }

        const rawCampaigns = await Promise.all(campaignPromises);

        const formatted = rawCampaigns.map((c, index) => ({
          id: index + 1,
          owner: c.owner,
          title: c.title,
          description: c.description,
          ipfsHash: c.ipfsHash,
          goalAmount: c.goalAmount,
          raisedAmount: c.raisedAmount,
          disbursedAmount: c.disbursedAmount,
          isActive: c.isActive,
        }));

        setCampaignsList(formatted);
        setLoading(false);

        // Run parallel wallet risk analysis in background for unique owners
        const uniqueOwners = [...new Set(formatted.map((c) => c.owner).filter(Boolean))];
        const verifyPromises = uniqueOwners.map(async (ownerAddr) => {
          try {
            const res = await verifyCampaign(ownerAddr);
            return { owner: ownerAddr, res };
          } catch {
            return { owner: ownerAddr, res: null };
          }
        });

        const verifyResults = await Promise.all(verifyPromises);
        const verifyMap = {};
        formatted.forEach((camp) => {
          const match = verifyResults.find((v) => v.owner.toLowerCase() === camp.owner.toLowerCase());
          if (match?.res) {
            verifyMap[camp.id] = match.res;
          }
        });
        setVerificationsMap(verifyMap);
      } catch (err) {
        console.error('Failed to fetch campaigns on-chain:', err);
        setLoading(false);
      }
    }

    fetchAllCampaigns();
  }, [campaignCount, publicClient]);

  // Auto-polling every 6 seconds to update live raised amounts and campaigns
  useEffect(() => {
    const interval = setInterval(() => {
      refetchCount();
    }, 6000);
    return () => clearInterval(interval);
  }, [refetchCount]);

  // Filter & Search Logic
  const filteredCampaigns = campaignsList.filter((camp) => {
    const titleMatch = camp.title.toLowerCase().includes(search.toLowerCase());
    const descMatch = camp.description.toLowerCase().includes(search.toLowerCase());
    const ownerMatch = camp.owner.toLowerCase().includes(search.toLowerCase());
    const matchesSearch = titleMatch || descMatch || ownerMatch;

    if (!matchesSearch) return false;

    const goalNum = Number(camp.goalAmount || 1n);
    const raisedNum = Number(camp.raisedAmount || 0n);
    const isGoalReached = raisedNum >= goalNum && goalNum > 0;
    const vBadge = verificationsMap[camp.id]?.badge;

    if (filter === 'MY_CAMPAIGNS') {
      if (!userAddress) return false;
      return camp.owner.toLowerCase() === userAddress.toLowerCase();
    }
    if (filter === 'ACTIVE') return camp.isActive && !isGoalReached;
    if (filter === 'VERIFIED') return vBadge === 'VERIFIED';
    if (filter === 'GOAL_REACHED') return isGoalReached;

    return true;
  });

  // User's own campaigns summary metrics
  const myCampaigns = userAddress
    ? campaignsList.filter((c) => c.owner.toLowerCase() === userAddress.toLowerCase())
    : [];

  const myTotalRaised = myCampaigns.reduce(
    (acc, c) => acc + Number(formatEther(c.raisedAmount || 0n)),
    0
  );
  const myTotalDisbursed = myCampaigns.reduce(
    (acc, c) => acc + Number(formatEther(c.disbursedAmount || 0n)),
    0
  );
  const myAvailableVault = Math.max(0, myTotalRaised - myTotalDisbursed);

  // Separate active vs completed for 'ALL' view
  const activeCampaigns = filteredCampaigns.filter((c) => {
    const goalNum = Number(c.goalAmount || 1n);
    const raisedNum = Number(c.raisedAmount || 0n);
    const isGoalReached = raisedNum >= goalNum && goalNum > 0;
    return c.isActive && !isGoalReached;
  });

  const completedCampaigns = filteredCampaigns.filter((c) => {
    const goalNum = Number(c.goalAmount || 1n);
    const raisedNum = Number(c.raisedAmount || 0n);
    const isGoalReached = raisedNum >= goalNum && goalNum > 0;
    return !c.isActive || isGoalReached;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
      
      {/* ── Apple Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] text-[var(--apple-green)] text-[11px] font-semibold uppercase tracking-wider">
            <span>On-Chain Crowdfunding Matrix</span>
          </div>
          <h1 className="section-title text-[var(--text-primary)]">
            {filter === 'MY_CAMPAIGNS' ? 'My Created Campaigns' : 'Browse Verified Campaigns'}
          </h1>
          <p className="text-[var(--text-secondary)] text-xs font-normal">
            {filter === 'MY_CAMPAIGNS'
              ? 'Manage and monitor campaigns registered by your active wallet on Sepolia.'
              : 'Explore transparent crowdfunding campaigns verified by TrustChain smart contracts.'}
          </p>
        </div>

        <Link
          to="/create"
          className="px-5 py-2.5 rounded-full bg-[var(--apple-green)] hover:bg-[var(--apple-green-hover)] text-white font-semibold text-xs shadow-md transition-all self-start md:self-auto cursor-pointer apple-press flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Launch Campaign</span>
        </Link>
      </div>

      {/* ── Apple Segmented Filter Bar & Spotlight Search ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Segmented Pills */}
        <div className="apple-segmented overflow-x-auto p-1">
          {[
            { id: 'ALL', label: 'All Campaigns' },
            { id: 'MY_CAMPAIGNS', label: 'My Campaigns' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'VERIFIED', label: 'Verified Only' },
            { id: 'GOAL_REACHED', label: 'Goal Reached' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`apple-segmented-item ${filter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input (Apple Spotlight Style) */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search title, description, or 0x..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full apple-glass rounded-full pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--apple-blue-border)] transition-colors font-medium"
          />
          <svg className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* ── MY CAMPAIGNS SUMMARY OVERVIEW BANNER ── */}
      {filter === 'MY_CAMPAIGNS' && userAddress && (
        <div className="apple-glass p-6 sm:p-7 rounded-3xl space-y-5 border border-[var(--apple-green-border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
            <div>
              <h2 className="headline text-[var(--text-primary)]">
                My Wallet Summary Overview
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                Active Address: <span className="text-[var(--apple-green)] font-semibold">{userAddress}</span>
              </p>
            </div>
            <Link
              to={`/audit/${userAddress}`}
              className="text-xs px-4 py-2 rounded-full apple-inset font-semibold text-[var(--apple-green)] hover:border-[var(--apple-green-border)] transition-all self-start sm:self-auto cursor-pointer apple-press"
            >
              View Wallet Audit →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="apple-inset p-4 rounded-2xl space-y-1">
              <span className="caption-label text-[var(--text-muted)]">Created Campaigns</span>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">{myCampaigns.length}</p>
            </div>

            <div className="apple-inset p-4 rounded-2xl space-y-1">
              <span className="caption-label text-[var(--apple-green)]">Total Received</span>
              <p className="text-2xl font-extrabold text-[var(--apple-green)]">{myTotalRaised.toFixed(4)} ETH</p>
            </div>

            <div className="apple-inset p-4 rounded-2xl space-y-1">
              <span className="caption-label text-[var(--text-muted)]">Total Disbursed</span>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">{myTotalDisbursed.toFixed(4)} ETH</p>
            </div>

            <div className="apple-inset p-4 rounded-2xl space-y-1">
              <span className="caption-label text-[var(--apple-blue)]">Vault Balance</span>
              <p className="text-2xl font-extrabold text-[var(--apple-blue)]">{myAvailableVault.toFixed(4)} ETH</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Campaign Grid Section ── */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="apple-glass p-6 rounded-3xl space-y-4 animate-pulse">
              <div className="h-4 bg-[var(--border-color)] rounded-full w-1/3"></div>
              <div className="h-6 bg-[var(--border-color)] rounded-full w-3/4"></div>
              <div className="h-16 bg-[var(--border-color)] rounded-2xl"></div>
              <div className="h-3 bg-[var(--border-color)] rounded-full w-full"></div>
            </div>
          ))}
        </div>
      ) : filter === 'MY_CAMPAIGNS' && !userAddress ? (
        <div className="apple-glass p-12 rounded-3xl text-center space-y-4 animate-apple-fade-in shadow-lg">
          <h3 className="headline text-[var(--text-primary)]">Wallet Not Connected</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto font-normal">
            Connect your Web3 wallet to view campaigns launched under your address.
          </p>
          <div className="flex justify-center pt-2">
            <ConnectButton />
          </div>
        </div>
      ) : filter === 'MY_CAMPAIGNS' && filteredCampaigns.length === 0 ? (
        <div className="apple-glass p-12 rounded-3xl text-center space-y-4 animate-apple-fade-in shadow-lg">
          <h3 className="headline text-[var(--text-primary)]">No Campaigns Registered Yet</h3>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            Address: {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] font-normal">
            You haven't published any campaigns on-chain under this wallet address.
          </p>
          <div className="pt-2">
            <Link
              to="/create"
              className="inline-block px-5 py-2.5 rounded-full bg-[var(--apple-green)] hover:bg-[var(--apple-green-hover)] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer apple-press"
            >
              + Create First Campaign
            </Link>
          </div>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="apple-glass p-12 rounded-3xl text-center space-y-2">
          <h3 className="headline text-[var(--text-primary)]">No Campaigns Found</h3>
          <p className="text-xs text-[var(--text-secondary)]">No campaigns match your filter or search query.</p>
        </div>
      ) : filter === 'ALL' ? (
        <div className="space-y-10 animate-apple-fade-in">
          {/* Active Crowdfunding */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="headline text-[var(--text-primary)]">Active Crowdfunding</h2>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)]">
                {activeCampaigns.length} Active
              </span>
            </div>

            {activeCampaigns.length === 0 ? (
              <div className="apple-inset p-8 rounded-3xl text-center">
                <p className="text-xs font-semibold text-[var(--text-muted)]">No active campaigns currently raising funds.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCampaigns.map((camp) => (
                  <CampaignCard
                    key={camp.id}
                    camp={camp}
                    ethPrice={ethPrice}
                    vData={verificationsMap[camp.id]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Completed / Goal Reached */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="headline text-[var(--text-primary)]">Completed & Closed Campaigns</h2>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full apple-inset text-[var(--text-muted)] border border-[var(--border-color)]">
                {completedCampaigns.length} Completed
              </span>
            </div>

            {completedCampaigns.length === 0 ? (
              <div className="apple-inset p-8 rounded-3xl text-center">
                <p className="text-xs font-semibold text-[var(--text-muted)]">No completed campaigns yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCampaigns.map((camp) => (
                  <CampaignCard
                    key={camp.id}
                    camp={camp}
                    ethPrice={ethPrice}
                    vData={verificationsMap[camp.id]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Focused Filter View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-apple-fade-in">
          {filteredCampaigns.map((camp) => (
            <CampaignCard
              key={camp.id}
              camp={camp}
              ethPrice={ethPrice}
              vData={verificationsMap[camp.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ camp, ethPrice, vData }) {
  const raised = formatEther(camp.raisedAmount || 0n);
  const goal = formatEther(camp.goalAmount || 0n);
  const goalNum = Number(camp.goalAmount || 1n);
  const raisedNum = Number(camp.raisedAmount || 0n);
  const percent = goalNum > 0 ? Math.min(100, Math.round((raisedNum / goalNum) * 100)) : 0;
  const isGoalReached = raisedNum >= goalNum && goalNum > 0;

  return (
    <div className="apple-glass p-6 rounded-3xl flex flex-col justify-between space-y-5 hover-lift group relative overflow-hidden">
      {/* Top Badge Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--apple-blue-tint)] text-[var(--apple-blue)] border border-[var(--apple-blue-border)]">
            Campaign #{camp.id}
          </span>
          <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
            {!camp.isActive ? (
              <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 font-semibold">Closed</span>
            ) : isGoalReached ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-semibold border border-[var(--apple-green-border)]">
                Goal Reached
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--apple-green)] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-green)] animate-pulse" />
                Active
              </span>
            )}
          </span>
        </div>

        {/* Verification Badge */}
        {vData && (
          <VerificationBadge
            badge={vData.badge}
            score={vData.score}
            reason={vData.reason}
            size="sm"
          />
        )}

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--apple-blue)] transition-colors line-clamp-1">
            {camp.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed font-normal">
            {camp.description}
          </p>
        </div>
      </div>

      {/* Progress Bar & Amount */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
        <div className="space-y-1.5">
          <div className="flex justify-between items-end text-xs font-semibold">
            <span className="text-[var(--apple-green)] font-bold text-sm">
              {raised} ETH
              {ethPrice > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">
                  ({formatUsd(raised, ethPrice)})
                </span>
              )}
            </span>
            <span className="text-[var(--text-muted)] font-mono text-[11px]">{percent}%</span>
          </div>

          {/* Apple-Style Sleek Progress Pill */}
          <div className="w-full bg-[var(--bg-inset)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="bg-gradient-to-r from-[var(--apple-green)] to-[var(--apple-blue)] h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] font-medium">
            <span>Goal: {goal} ETH</span>
            {ethPrice > 0 && <span>{formatUsd(goal, ethPrice)}</span>}
          </div>
        </div>

        {/* View Details Link Button */}
        <Link
          to={`/campaigns/${camp.id}`}
          className="w-full py-2.5 rounded-full apple-inset text-center text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--apple-blue)] hover:text-white dark:hover:bg-[var(--apple-blue)] dark:hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer apple-press"
        >
          <span>View Campaign Dossier</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
