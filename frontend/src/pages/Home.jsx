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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 relative overflow-hidden">
      {/* Subdued Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

      {/* Marquee Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-6 pt-4">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold tracking-wide uppercase shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sepolia Contract Verified & Audited</span>
        </div>

        {/* Display Heading — Roman, Extrabold, Balanced */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1] [text-wrap:balance]">
          Autonomous Risk Verification & Escrow Crowdfunding
        </h1>

        {/* Lead Paragraph */}
        <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-medium max-w-2xl mx-auto">
          TrustChain combines non-reentrant smart contract vault escrow with on-chain risk scoring, drain ratio analysis, and real-time transaction event ledgers.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/campaigns"
            className="btn-vibe px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Browse Verified Campaigns</span>
            <span>→</span>
          </Link>
          <Link
            to="/check"
            className="btn-vibe px-6 py-3 rounded-xl theme-card font-extrabold text-xs text-[var(--text-primary)] hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            Run Wallet Risk Check
          </Link>
        </div>
      </div>

      {/* Protocol Metrics Grid */}
      <div className="theme-card p-6 sm:p-8 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left shadow-lg">
        <div className="space-y-1.5 p-4 rounded-xl theme-inset">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Registered Campaigns</span>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">{totalCampaigns}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sepolia Ledger
          </span>
        </div>

        <div className="space-y-1.5 p-4 rounded-xl theme-inset">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Passed Audit Risk</span>
          <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{verifiedCount}</p>
          <span className="text-[11px] text-[var(--text-muted)] font-extrabold">
            Risk Score ≤ 25/100
          </span>
        </div>

        <div className="space-y-1.5 p-4 rounded-xl theme-inset">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Smart Contract</span>
          <p className="text-xs font-mono font-extrabold text-[var(--text-primary)] break-all pt-1">
            {CONTRACT_ADDRESS.slice(0, 12)}...{CONTRACT_ADDRESS.slice(-8)}
          </p>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline block pt-1"
          >
            View on Etherscan →
          </a>
        </div>

        <div className="space-y-1.5 p-4 rounded-xl theme-inset">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Escrow Protection</span>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">100%</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold">
            Non-Reentrant Vault Guard
          </span>
        </div>
      </div>

      {/* Institutional Workflow Grid */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border-color)] uppercase tracking-wider">
            Verification Protocol
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight [text-wrap:balance]">
            Three-Tier Security Protocol
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="theme-card p-6 sm:p-7 rounded-2xl space-y-4 hover-lift hover:border-emerald-500/40 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
              01
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Risk Engine Analysis
            </h3>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
              Evaluates target creator wallets across 5 signals: wallet age, transaction velocity, drain ratios, ETH balance, and CryptoScamDB blacklist databases.
            </p>
            <Link to="/check" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold inline-flex items-center gap-1 pt-1">
              <span>Run Risk Assessment</span>
              <span>→</span>
            </Link>
          </div>

          <div className="theme-card p-6 sm:p-7 rounded-2xl space-y-4 hover-lift hover:border-emerald-500/40 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
              02
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Transparent Campaign Discovery
            </h3>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
              Discover verified campaigns with automated risk badges (VERIFIED, CAUTION, HIGH RISK), IPFS metadata hashes, and funding progress.
            </p>
            <Link to="/campaigns" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold inline-flex items-center gap-1 pt-1">
              <span>Explore Matrix</span>
              <span>→</span>
            </Link>
          </div>

          <div className="theme-card p-6 sm:p-7 rounded-2xl space-y-4 hover-lift hover:border-emerald-500/40 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
              03
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Non-Reentrant Vault Escrow
            </h3>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
              Donations are locked inside smart contract escrow. Campaign owners must disburse funds transparently with full Etherscan event logging.
            </p>
            <Link to="/create" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold inline-flex items-center gap-1 pt-1">
              <span>Deploy Campaign</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

