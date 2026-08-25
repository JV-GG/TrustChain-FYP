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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-20 sm:space-y-24 relative overflow-hidden">
      
      {/* ── Apple Marquee Hero ── */}
      <div className="max-w-4xl mx-auto text-center space-y-6 pt-4 sm:pt-8">
        
        {/* Status Capsule */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] text-[var(--apple-green)] text-[11px] font-semibold tracking-wide uppercase shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[var(--apple-green)] animate-pulse" />
          <span>Sepolia Contract Verified & Audited</span>
        </div>

        {/* Display Heading — Apple Optical Weight */}
        <h1 className="display-title text-[var(--text-primary)]">
          Autonomous Risk Verification & Escrow Crowdfunding
        </h1>

        {/* Lead Paragraph */}
        <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal max-w-2xl mx-auto">
          TrustChain pairs non-reentrant smart contract vault escrow with on-chain risk scoring, drain ratio analysis, and live cryptographic event logs.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/campaigns"
            className="px-6 py-3 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer apple-press"
          >
            <span>Browse Verified Campaigns</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </Link>
          <Link
            to="/check"
            className="px-6 py-3 rounded-full apple-glass font-semibold text-xs text-[var(--text-primary)] hover:border-[var(--apple-blue-border)] transition-all cursor-pointer apple-press"
          >
            Run Wallet Risk Check
          </Link>
        </div>
      </div>

      {/* ── Apple Health / System Style Metrics Grid ── */}
      <div className="apple-glass p-6 sm:p-8 rounded-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
        
        {/* Metric 1: Registered Campaigns */}
        <div className="space-y-1.5 p-5 rounded-2xl apple-inset">
          <span className="caption-label text-[var(--text-muted)]">Registered Campaigns</span>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">{totalCampaigns}</p>
          <span className="text-[11px] text-[var(--apple-green)] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-green)] animate-pulse" />
            Live On-Chain Vaults
          </span>
        </div>

        {/* Metric 2: Verified Campaigns */}
        <div className="space-y-1.5 p-5 rounded-2xl apple-inset">
          <span className="caption-label text-[var(--text-muted)]">Passed Risk Audit</span>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--apple-green)] tracking-tight">{verifiedCount}</p>
          <span className="text-[11px] text-[var(--text-muted)] font-medium">
            Risk Score ≤ 25 / 100
          </span>
        </div>

        {/* Metric 3: Smart Contract */}
        <div className="space-y-1.5 p-5 rounded-2xl apple-inset">
          <span className="caption-label text-[var(--text-muted)]">Smart Contract</span>
          <p className="text-xs font-mono font-bold text-[var(--text-primary)] break-all pt-1">
            {CONTRACT_ADDRESS.slice(0, 12)}...{CONTRACT_ADDRESS.slice(-8)}
          </p>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[var(--apple-blue)] font-semibold hover:underline block pt-0.5"
          >
            View on Etherscan →
          </a>
        </div>

        {/* Metric 4: Escrow Protection */}
        <div className="space-y-1.5 p-5 rounded-2xl apple-inset">
          <span className="caption-label text-[var(--text-muted)]">Escrow Protection</span>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">100%</p>
          <span className="text-[11px] text-[var(--apple-green)] font-semibold">
            Non-Reentrant Vault Guard
          </span>
        </div>
      </div>

      {/* ── Apple-Style 3-Tier Security Protocol ── */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <span className="caption-label px-3 py-1 rounded-full apple-inset text-[var(--text-secondary)] border border-[var(--border-color)]">
            Security Architecture
          </span>
          <h2 className="section-title text-[var(--text-primary)]">
            Three-Tier Security Protocol
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="apple-glass p-7 rounded-3xl space-y-4 hover-lift hover:border-[var(--apple-blue-border)] group">
            <div className="w-10 h-10 rounded-2xl bg-[var(--apple-blue-tint)] border border-[var(--apple-blue-border)] flex items-center justify-center text-[var(--apple-blue)] font-bold text-sm">
              01
            </div>
            <h3 className="headline text-[var(--text-primary)] group-hover:text-[var(--apple-blue)] transition-colors">
              Risk Engine Analysis
            </h3>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-normal">
              Evaluates target creator wallets across 5 signals: wallet age, transaction velocity, drain ratios, ETH balance, and CryptoScamDB blacklist databases.
            </p>
            <Link to="/check" className="text-xs text-[var(--apple-blue)] hover:underline font-semibold inline-flex items-center gap-1 pt-1 apple-press">
              <span>Run Risk Assessment</span>
              <span>→</span>
            </Link>
          </div>

          {/* Card 2 */}
          <div className="apple-glass p-7 rounded-3xl space-y-4 hover-lift hover:border-[var(--apple-green-border)] group">
            <div className="w-10 h-10 rounded-2xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] flex items-center justify-center text-[var(--apple-green)] font-bold text-sm">
              02
            </div>
            <h3 className="headline text-[var(--text-primary)] group-hover:text-[var(--apple-green)] transition-colors">
              Transparent Discovery
            </h3>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-normal">
              Discover verified campaigns with automated risk badges (VERIFIED, CAUTION, HIGH RISK), IPFS metadata hashes, and funding progress.
            </p>
            <Link to="/campaigns" className="text-xs text-[var(--apple-green)] hover:underline font-semibold inline-flex items-center gap-1 pt-1 apple-press">
              <span>Explore Matrix</span>
              <span>→</span>
            </Link>
          </div>

          {/* Card 3 */}
          <div className="apple-glass p-7 rounded-3xl space-y-4 hover-lift hover:border-[var(--apple-amber-border)] group">
            <div className="w-10 h-10 rounded-2xl bg-[var(--apple-amber-tint)] border border-[var(--apple-amber-border)] flex items-center justify-center text-[var(--apple-amber)] font-bold text-sm">
              03
            </div>
            <h3 className="headline text-[var(--text-primary)] group-hover:text-[var(--apple-amber)] transition-colors">
              Non-Reentrant Vault Escrow
            </h3>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-normal">
              Donations are locked inside smart contract escrow. Campaign owners must disburse funds transparently with full Etherscan event logging.
            </p>
            <Link to="/create" className="text-xs text-[var(--apple-amber)] hover:underline font-semibold inline-flex items-center gap-1 pt-1 apple-press">
              <span>Deploy Campaign</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
