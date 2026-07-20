import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReadContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { useEthPrice, formatUsd } from '../hooks/useEthPrice';
import { verifyCampaign } from '../services/campaignVerifier';
import VerificationBadge from '../components/VerificationBadge';

export default function Campaigns() {
  const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, VERIFIED, GOAL_REACHED
  const [search, setSearch] = useState('');
  const [campaignsList, setCampaignsList] = useState([]);
  const [verificationsMap, setVerificationsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const { ethPrice } = useEthPrice();
  const publicClient = usePublicClient();

  // Read campaignCount from smart contract
  const { data: countData, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCampaignCount',
  });

  const campaignCount = countData ? Number(countData) : 0;

  // Fetch all campaigns and run async verification for each owner
  useEffect(() => {
    async function fetchAllCampaigns() {
      if (!campaignCount || !publicClient) {
        setLoading(false);
        return;
      }

      setLoading(true);
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

        // Perform async wallet risk analysis for each campaign owner
        const verifyMap = {};
        for (const camp of formatted) {
          if (camp.owner) {
            try {
              const res = await verifyCampaign(camp.owner);
              verifyMap[camp.id] = res;
            } catch (err) {
              console.error(`Verification error for campaign #${camp.id}:`, err);
            }
          }
        }
        setVerificationsMap(verifyMap);
      } catch (err) {
        console.error('Failed to fetch campaigns on-chain:', err);
      } finally {
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

    if (filter === 'ACTIVE') return camp.isActive && !isGoalReached;
    if (filter === 'VERIFIED') return vBadge === 'VERIFIED';
    if (filter === 'GOAL_REACHED') return isGoalReached;

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-extrabold uppercase tracking-wider animate-float">
            <span>🌐 On-Chain Crowdfunding</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">Explore Campaigns</h1>
          <p className="text-[var(--text-muted)] text-sm font-medium">
            Browse transparent, smart-contract verified campaigns on Ethereum Sepolia testnet.
          </p>
        </div>

        <Link
          to="/create"
          className="btn-vibe shimmer-effect px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/25 transition-all self-start md:self-auto cursor-pointer"
        >
          + Create Campaign
        </Link>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 theme-inset p-1.5 rounded-2xl">
          {[
            { id: 'ALL', label: 'All Campaigns' },
            { id: 'ACTIVE', label: '🟢 Active' },
            { id: 'VERIFIED', label: '✓ Verified' },
            { id: 'GOAL_REACHED', label: '🎉 Goal Reached' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search campaigns or 0x address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full theme-inset rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
          />
          <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)]">🔍</span>
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="theme-card p-6 rounded-2xl space-y-4 animate-pulse">
              <div className="h-4 bg-[var(--border-color)] rounded w-1/3"></div>
              <div className="h-6 bg-[var(--border-color)] rounded w-3/4"></div>
              <div className="h-16 bg-[var(--border-color)] rounded"></div>
              <div className="h-3 bg-[var(--border-color)] rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="theme-card p-12 rounded-2xl text-center space-y-3">
          <span className="text-4xl">🔍</span>
          <h3 className="text-lg font-extrabold text-[var(--text-primary)]">No Campaigns Found</h3>
          <p className="text-xs text-[var(--text-muted)]">No campaigns match your filter or search query.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((camp) => {
            const raised = formatEther(camp.raisedAmount || 0n);
            const goal = formatEther(camp.goalAmount || 0n);
            const goalNum = Number(camp.goalAmount || 1n);
            const raisedNum = Number(camp.raisedAmount || 0n);
            const percent = goalNum > 0 ? Math.min(100, Math.round((raisedNum / goalNum) * 100)) : 0;
            const isGoalReached = raisedNum >= goalNum && goalNum > 0;
            const vData = verificationsMap[camp.id];

            return (
              <div
                key={camp.id}
                className="theme-card p-6 rounded-2xl flex flex-col justify-between space-y-5 hover-lift group relative overflow-hidden"
              >
                {/* Top Badge Row */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Campaign #{camp.id}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                      {!camp.isActive ? (
                        '🔴 Closed'
                      ) : isGoalReached ? (
                        '🎉 Goal Reached'
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
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
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed font-medium">
                      {camp.description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar & Amount */}
                <div className="space-y-4 pt-2 border-t border-[var(--border-color)]">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end text-xs font-extrabold">
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                        {raised} ETH
                        {ethPrice > 0 && (
                          <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">
                            ({formatUsd(raised, ethPrice)})
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--text-muted)]">{percent}%</span>
                    </div>

                    <div className="w-full theme-inset h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] font-semibold">
                      <span>Goal: {goal} ETH</span>
                      {ethPrice > 0 && <span>{formatUsd(goal, ethPrice)}</span>}
                    </div>
                  </div>

                  {/* View Details Link Button */}
                  <Link
                    to={`/campaigns/${camp.id}`}
                    className="btn-vibe w-full py-2.5 rounded-xl theme-inset text-center text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Campaign Details</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
