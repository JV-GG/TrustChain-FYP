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
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
          <span>🛡️ Verified Smart Contract on Sepolia</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-400 bg-clip-text text-transparent">
          Transparent Crowdfunding Powered by Ethereum
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          TrustChain ensures complete financial transparency with on-chain campaign tracking, donation escrow, risk analysis, and verifiable fund disbursement records.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/campaigns"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
          >
            Explore Campaigns
          </Link>
          <Link
            to="/create"
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-all hover:scale-105"
          >
            Start a Campaign
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center shadow-xl">
        <div className="space-y-1">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Campaigns</span>
          <p className="text-4xl font-extrabold text-white">{totalCampaigns}</p>
          <span className="text-xs text-indigo-400 font-medium">Registered on Sepolia</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Verified Campaigns</span>
          <p className="text-4xl font-extrabold text-emerald-400">{verifiedCount}</p>
          <span className="text-xs text-emerald-300/80 font-medium">Passed Risk Engine Audit</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Smart Contract</span>
          <p className="text-xs font-mono font-bold text-indigo-300 break-all pt-2">
            {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
          </p>
          <span className="text-xs text-indigo-400 font-medium">Verified on Etherscan</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Security Escrow</span>
          <p className="text-4xl font-extrabold text-indigo-400">100%</p>
          <span className="text-xs text-slate-400 font-medium">Non-Reentrant Escrow</span>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="text-3xl font-extrabold text-white">Three Simple Steps to Safe Donation</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl">
              1
            </div>
            <h3 className="text-xl font-bold text-white">Check Wallet</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Paste any wallet address into our Risk Engine to get a real-time risk score, drain ratio analysis, and CryptoScamDB audit report.
            </p>
            <Link to="/check" className="text-xs text-indigo-400 hover:underline font-semibold block pt-2">
              Try Check Wallet →
            </Link>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl">
              2
            </div>
            <h3 className="text-xl font-bold text-white">Browse Campaigns</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              View verified charitable campaigns registered on-chain with live funding progress bars and transparent creator profiles.
            </p>
            <Link to="/campaigns" className="text-xs text-purple-400 hover:underline font-semibold block pt-2">
              Browse Campaigns →
            </Link>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
              3
            </div>
            <h3 className="text-xl font-bold text-white">Donate Safely</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Donate ETH securely into non-reentrant contract escrow. Monitor fund disbursements with full on-chain transparency.
            </p>
            <Link to="/create" className="text-xs text-emerald-400 hover:underline font-semibold block pt-2">
              Start a Campaign →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
