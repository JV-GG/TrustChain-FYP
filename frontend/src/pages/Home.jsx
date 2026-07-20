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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6 animate-fade-in relative">
        {/* Decorative Ambient Background Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/20 blur-3xl rounded-full pointer-events-none -z-10"></div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold tracking-wide uppercase">
          <span>🛡️ Verified Smart Contract on Sepolia</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Transparent Crowdfunding Powered by Ethereum
        </h1>

        <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          TrustChain ensures complete financial transparency with on-chain campaign tracking, non-reentrant escrow, risk analysis, and verifiable fund disbursement logs.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/campaigns"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Explore Campaigns →
          </Link>
          <Link
            to="/create"
            className="px-6 py-3.5 rounded-xl theme-card font-extrabold text-sm text-slate-900 dark:text-white hover:border-indigo-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start a Campaign
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="theme-card p-8 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center shadow-xl">
        <div className="space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Total Campaigns</span>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{totalCampaigns}</p>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Registered on Sepolia</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Verified Campaigns</span>
          <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{verifiedCount}</p>
          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">Passed Risk Audit</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Smart Contract</span>
          <p className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 break-all pt-2">
            {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
          </p>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Verified on Etherscan</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">Security Escrow</span>
          <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">100%</p>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">Non-Reentrant Escrow</span>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Three Steps to Safe Crowdfunding</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="theme-card p-6 rounded-2xl space-y-4 hover:border-indigo-500/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xl">
              1
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Check Wallet Risk</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Paste any wallet address into our Risk Engine to compute risk score, drain ratios, and CryptoScamDB blacklists.
            </p>
            <Link to="/check" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold block pt-2">
              Try Check Wallet →
            </Link>
          </div>

          <div className="theme-card p-6 rounded-2xl space-y-4 hover:border-purple-500/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-extrabold text-xl">
              2
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Browse Campaigns</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Explore verified campaigns on-chain with live funding progress bars and transparent owner profiles.
            </p>
            <Link to="/campaigns" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-extrabold block pt-2">
              Browse Campaigns →
            </Link>
          </div>

          <div className="theme-card p-6 rounded-2xl space-y-4 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xl">
              3
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Donate Safely</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Donate ETH directly into non-reentrant contract escrow. Real-time transaction history keeps everything transparent.
            </p>
            <Link to="/create" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold block pt-2">
              Start a Campaign →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
