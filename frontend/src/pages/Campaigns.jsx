import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReadContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { verifyCampaign } from '../services/campaignVerifier';
import VerificationBadge from '../components/VerificationBadge';

export default function Campaigns() {
  const [badgeFilter, setBadgeFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'CAUTION' | 'FLAGGED'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ONGOING' | 'COMPLETED'
  const [showTooltip, setShowTooltip] = useState(false);
  const [campaignList, setCampaignList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: countData, isLoading: isCountLoading, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCampaignCount',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetchCount();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchCount]);

  const campaignCount = countData ? Number(countData) : 0;
  const publicClient = usePublicClient();

  useEffect(() => {
    async function loadAndVerifyAllCampaigns() {
      if (isCountLoading) return;
      if (campaignCount === 0) {
        setCampaignList([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const items = [];
        for (let i = 1; i <= campaignCount; i++) {
          let campaign = null;
          if (publicClient) {
            try {
              const res = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'getCampaign',
                args: [BigInt(i)],
              });
              campaign = res;
            } catch (err) {
              console.error(`Failed to read campaign #${i}:`, err);
            }
          }

          if (campaign && campaign.isActive) {
            const verification = await verifyCampaign(campaign.owner);
            const raisedNum = Number(campaign.raisedAmount || 0n);
            const goalNum = Number(campaign.goalAmount || 1n);
            const isCompleted = raisedNum >= goalNum && goalNum > 0;

            items.push({
              id: i,
              title: campaign.title,
              description: campaign.description,
              owner: campaign.owner,
              goalAmount: campaign.goalAmount,
              raisedAmount: campaign.raisedAmount,
              isActive: campaign.isActive,
              isCompleted,
              verification,
            });
          }
        }

        // Priority sorting: VERIFIED -> CAUTION -> UNVERIFIED -> FLAGGED
        const priorityMap = {
          VERIFIED: 1,
          CAUTION: 2,
          UNVERIFIED: 3,
          FLAGGED: 4,
        };

        items.sort((a, b) => {
          const prioA = priorityMap[a.verification?.badge] || 3;
          const prioB = priorityMap[b.verification?.badge] || 3;
          return prioA - prioB;
        });

        setCampaignList(items);
      } catch (err) {
        console.error('Error fetching campaigns list:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAndVerifyAllCampaigns();
  }, [campaignCount, isCountLoading, publicClient]);

  // Apply Trust Badge filter
  const badgeFiltered = campaignList.filter((item) => {
    if (badgeFilter === 'ALL') return true;
    if (badgeFilter === 'VERIFIED') return item.verification?.badge === 'VERIFIED';
    if (badgeFilter === 'CAUTION') return item.verification?.badge === 'CAUTION';
    if (badgeFilter === 'FLAGGED') return item.verification?.badge === 'FLAGGED';
    return true;
  });

  // Separate into Ongoing and Completed lists
  const ongoingCampaigns = badgeFiltered.filter((item) => !item.isCompleted);
  const completedCampaigns = badgeFiltered.filter((item) => item.isCompleted);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Crowdfunding Campaigns</h1>
          <p className="text-slate-400 mt-1">
            Explore active fundraising initiatives and view successfully completed campaigns.
          </p>
        </div>
        <Link
          to="/create"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all self-start sm:self-auto flex items-center gap-2"
        >
          <span>+ Create Campaign</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter('ONGOING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ONGOING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🔥 Ongoing ({ongoingCampaigns.length})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'COMPLETED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎉 Target Met ({completedCampaigns.length})
            </button>
          </div>

          {/* Trust Badge Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: 'ALL', label: 'All Badges' },
              { key: 'VERIFIED', label: '🛡️ Verified' },
              { key: 'CAUTION', label: '⚠️ Caution' },
              { key: 'FLAGGED', label: '🚩 Flagged' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBadgeFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  badgeFilter === tab.key
                    ? 'bg-slate-800 text-indigo-300 border border-indigo-500/40 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Tooltip Toggle */}
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 self-end lg:self-auto"
        >
          <span>💡 Trust Badges Legend</span>
          <span>{showTooltip ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Verification Badge Explainer Box */}
      {showTooltip && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-indigo-500/30 space-y-3 text-xs text-slate-300 shadow-xl animate-fadeIn">
          <h3 className="font-bold text-white text-sm">TrustChain Badge Legend</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="font-bold text-emerald-400">🛡️ VERIFIED (Score 0-25)</span>
              <p className="text-[11px] text-slate-400">Owner wallet passes all risk checks & isn't blacklisted.</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="font-bold text-amber-400">⚠️ CAUTION (Score 26-50)</span>
              <p className="text-[11px] text-slate-400">Owner wallet shows moderate activity or newer age.</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1">
              <span className="font-bold text-orange-400">✗ UNVERIFIED (Score 51-75)</span>
              <p className="text-[11px] text-slate-400">Owner wallet shows high risk signals or rapid transfers.</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
              <span className="font-bold text-rose-400">🚩 FLAGGED (Score 76+)</span>
              <p className="text-[11px] text-slate-400">Wallet flagged as high risk or blacklisted on CryptoScamDB.</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 animate-pulse space-y-4">
              <div className="h-6 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              <div className="h-10 bg-slate-800 rounded-xl pt-2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && campaignList.length === 0 && (
        <div className="bg-slate-900/60 p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="text-5xl">📢</div>
          <h3 className="text-xl font-bold text-white">No Active Campaigns</h3>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            There are currently no active campaigns registered on-chain. Be the first to start one!
          </p>
          <div className="pt-2">
            <Link
              to="/create"
              className="inline-block px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
            >
              Start First Campaign
            </Link>
          </div>
        </div>
      )}

      {/* SECTION 1: ONGOING FUNDRAISING */}
      {!isLoading && (statusFilter === 'ALL' || statusFilter === 'ONGOING') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🔥</span>
              <span>Ongoing Fundraising</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {ongoingCampaigns.length} Needs Funding
              </span>
            </h2>
          </div>

          {ongoingCampaigns.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 text-center">
              No ongoing campaigns matching selected badge filters.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoingCampaigns.map((camp) => (
                <CampaignCard key={camp.id} campaign={camp} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: COMPLETED CAMPAIGNS (TARGET MET) */}
      {!isLoading && (statusFilter === 'ALL' || statusFilter === 'COMPLETED') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎉</span>
              <span>Target Goal Met (Completed)</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {completedCampaigns.length} Fully Funded
              </span>
            </h2>
          </div>

          {completedCampaigns.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 text-center">
              No completed campaigns yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCampaigns.map((camp) => (
                <CampaignCard key={camp.id} campaign={camp} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }) {
  const goal = formatEther(campaign.goalAmount || 0n);
  const raised = formatEther(campaign.raisedAmount || 0n);
  const goalNum = Number(campaign.goalAmount || 1n);
  const raisedNum = Number(campaign.raisedAmount || 0n);

  const percent = goalNum > 0 ? Math.min(100, Math.round((raisedNum / goalNum) * 100)) : 0;
  const isGoalReached = campaign.isCompleted;

  const truncatedDesc =
    campaign.description.length > 100 ? `${campaign.description.slice(0, 100)}...` : campaign.description;

  return (
    <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition-all group shadow-lg relative overflow-hidden">
      <div className="space-y-4">
        {/* Top Header: Badge & Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <VerificationBadge
            badge={campaign.verification?.badge || 'UNVERIFIED'}
            score={campaign.verification?.score}
            reason={campaign.verification?.reason}
            size="sm"
          />

          {isGoalReached ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span>🎉</span>
              <span>Goal Reached</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
              🟢 Active
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
          {campaign.title}
        </h3>

        <p className="text-slate-400 text-sm leading-relaxed min-h-[2.5rem]">
          {truncatedDesc}
        </p>

        {/* Progress Bar & Amounts */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-emerald-400">{raised} ETH Raised</span>
            <span className="text-slate-400">Goal: {goal} ETH</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 text-right font-semibold">
            {isGoalReached ? '100% Fully Funded' : `${percent}% Funded`}
          </p>
        </div>
      </div>

      <div className="pt-6">
        <Link
          to={`/campaigns/${campaign.id}`}
          className={`w-full block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isGoalReached
              ? 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white'
              : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
          }`}
        >
          {isGoalReached ? 'View Completed Campaign →' : 'View Campaign & Donate →'}
        </Link>
      </div>
    </div>
  );
}
