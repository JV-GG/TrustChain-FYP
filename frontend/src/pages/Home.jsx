import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReadContract, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { verifyCampaign } from '../services/campaignVerifier';

export default function Home() {
  const [verifiedCount, setVerifiedCount] = useState(0);

  // Read total campaign count on-chain
  const { data: countData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCampaignCount',
  });

  const totalCampaigns = countData ? Number(countData) : 0;
  const publicClient = usePublicClient();

  useEffect(() => {
    async function calculateVerifiedCampaigns() {
      if (!totalCampaigns || !publicClient) return;
      let count = 0;
      for (let i = 1; i <= totalCampaigns; i++) {
        try {
          const campaign = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getCampaign',
            args: [BigInt(i)],
          });
          if (campaign?.owner) {
            const verification = await verifyCampaign(campaign.owner);
            if (verification?.badge === 'VERIFIED') {
              count++;
            }
          }
        } catch (err) {
          console.error(`Failed to verify campaign #${i} for home stats:`, err);
        }
      }
      setVerifiedCount(count);
    }

    calculateVerifiedCampaigns();
  }, [totalCampaigns, publicClient]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24 relative overflow-hidden">
      {/* Dynamic Floating Ambient Background Spheres */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-glow"></div>
      <div className="absolute top-96 -left-32 w-80 h-80 bg-purple-500/10 dark:bg-purple-600/15 blur-[100px] rounded-full pointer-events-none -z-10 animate-float"></div>
      <div className="absolute bottom-10 -right-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 blur-[110px] rounded-full pointer-events-none -z-10 animate-pulse-glow"></div>

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-8 animate-fade-in relative">
        {/* Floating Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold tracking-wide uppercase shadow-sm animate-float">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span>🛡️ Verified Smart Contract on Sepolia</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Transparent Crowdfunding Powered by Ethereum
        </h1>

        <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          TrustChain ensures complete financial transparency with on-chain campaign tracking, non-reentrant escrow, risk analysis, and verifiable fund disbursement logs.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/campaigns"
            className="btn-vibe shimmer-effect px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Explore Campaigns</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            to="/create"
            className="btn-vibe px-7 py-3.5 rounded-xl theme-card font-extrabold text-sm text-slate-900 dark:text-white hover:border-indigo-500/50 transition-all cursor-pointer"
          >
            Start a Campaign
          </Link>
        </div>
      </div>

      {/* Stats Section with Hover Lift & Ambient Glow */}
      <div className="theme-card p-8 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center shadow-xl hover-lift">
        <div className="space-y-1.5 p-4 rounded-xl hover:bg-[var(--border-subtle)]/20 transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Total Campaigns</span>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{totalCampaigns}</p>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Registered on Sepolia
          </span>
        </div>

        <div className="space-y-1.5 p-4 rounded-xl hover:bg-[var(--border-subtle)]/20 transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Verified Campaigns</span>
          <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{verifiedCount}</p>
          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-1">
            <span>✓</span> Passed Risk Audit
          </span>
        </div>

        <div className="space-y-1.5 p-4 rounded-xl hover:bg-[var(--border-subtle)]/20 transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Smart Contract</span>
          <p className="text-xs font-mono font-extrabold text-indigo-700 dark:text-indigo-300 break-all pt-2">
            {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
          </p>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Verified on Etherscan</span>
        </div>

        <div className="space-y-1.5 p-4 rounded-xl hover:bg-[var(--border-subtle)]/20 transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Security Escrow</span>
          <p className="text-4xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">100%</p>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">Non-Reentrant Vault</span>
        </div>
      </div>

      {/* How It Works Section with Staggered Motion */}
      <div className="space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Three Steps to Safe Crowdfunding</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="theme-card p-7 rounded-2xl space-y-5 hover-lift hover:border-indigo-500/50 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-2xl group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
              1
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Check Wallet Risk
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Paste any wallet address into our Risk Engine to compute risk score, drain ratios, and CryptoScamDB blacklists.
            </p>
            <Link to="/check" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold flex items-center gap-1 pt-2">
              <span>Try Check Wallet</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="theme-card p-7 rounded-2xl space-y-5 hover-lift hover:border-purple-500/50 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-extrabold text-2xl group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
              2
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Browse Campaigns
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Explore verified campaigns on-chain with live funding progress bars and transparent owner profiles.
            </p>
            <Link to="/campaigns" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-extrabold flex items-center gap-1 pt-2">
              <span>Browse Campaigns</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="theme-card p-7 rounded-2xl space-y-5 hover-lift hover:border-emerald-500/50 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-2xl group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
              3
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Donate Safely
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Donate ETH directly into non-reentrant contract escrow. Real-time transaction history keeps everything transparent.
            </p>
            <Link to="/create" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold flex items-center gap-1 pt-2">
              <span>Start a Campaign</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
