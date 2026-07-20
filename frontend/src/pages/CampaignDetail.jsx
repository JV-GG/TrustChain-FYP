import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { useEthPrice, formatUsd } from '../hooks/useEthPrice';
import { verifyCampaign } from '../services/campaignVerifier';
import VerificationBadge from '../components/VerificationBadge';

export default function CampaignDetail() {
  const { id } = useParams();
  const campaignId = BigInt(id || 1);
  const { address } = useAccount();
  const { ethPrice } = useEthPrice();
  const navigate = useNavigate();

  const [donationEth, setDonationEth] = useState('');
  const [donationError, setDonationError] = useState('');
  const [deactivateError, setDeactivateError] = useState('');

  // Verification State
  const [verification, setVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Transaction history state
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // 1. Read Campaign Details
  const { data: campaign, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCampaign',
    args: [campaignId],
  });

  // 2. Run Verification on Owner Wallet
  useEffect(() => {
    async function runVerification() {
      if (!campaign?.owner) return;
      setIsVerifying(true);
      try {
        const res = await verifyCampaign(campaign.owner);
        setVerification(res);
      } catch (err) {
        console.error('Failed to verify campaign owner:', err);
      } finally {
        setIsVerifying(false);
      }
    }

    runVerification();
  }, [campaign?.owner]);

  // 3. Donation Transaction Hook
  const {
    data: donateTxHash,
    isPending: isDonatePending,
    writeContractAsync: donateAsync,
  } = useWriteContract();

  const { isLoading: isDonateConfirming, isSuccess: isDonateSuccess } = useWaitForTransactionReceipt({
    hash: donateTxHash,
  });

  // Trigger celebration confetti when donation succeeds
  useEffect(() => {
    if (isDonateSuccess) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#a855f7', '#3b82f6', '#f59e0b'],
      });
    }
  }, [isDonateSuccess]);

  // 4. Deactivation Transaction Hook
  const {
    data: deactivateTxHash,
    isPending: isDeactivatePending,
    writeContractAsync: deactivateAsync,
  } = useWriteContract();

  const { isLoading: isDeactivateConfirming, isSuccess: isDeactivateSuccess } = useWaitForTransactionReceipt({
    hash: deactivateTxHash,
  });

  useEffect(() => {
    if (isDeactivateSuccess) {
      setTimeout(() => {
        navigate('/campaigns');
      }, 2000);
    }
  }, [isDeactivateSuccess, navigate]);

  // 5. Fetch Etherscan transactions for this campaign's contract interactions
  useEffect(() => {
    async function fetchTransactions() {
      if (!campaign?.owner) return;
      setTxLoading(true);
      try {
        const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';

        const res = await axios.get('https://api.etherscan.io/v2/api', {
          params: {
            chainid: 11155111,
            module: 'account',
            action: 'txlist',
            address: CONTRACT_ADDRESS,
            startblock: 0,
            endblock: 99999999,
            sort: 'desc',
            apikey: apiKey,
          },
          timeout: 10000,
        });

        let rawTxs = [];
        if (res.data && Array.isArray(res.data.result)) {
          rawTxs = res.data.result;
        }

        const processed = rawTxs
          .map((tx) => {
            let valEth = 0;
            try {
              valEth = Number(formatEther(BigInt(tx.value || '0')));
            } catch {
              valEth = Number(tx.value || 0) / 1e18;
            }

            const txDate = tx.timeStamp
              ? new Date(Number(tx.timeStamp) * 1000)
              : null;

            let type = 'Contract Call';
            const fnName = (tx.functionName || '').toLowerCase();
            if (fnName.includes('donate')) {
              type = 'Donation';
            } else if (fnName.includes('disburse')) {
              type = 'Disbursement';
            } else if (fnName.includes('deactivate')) {
              type = 'Campaign Deactivated';
            } else if (fnName.includes('create')) {
              type = 'Campaign Created';
            }

            return {
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: valEth,
              type,
              date: txDate,
              functionName: tx.functionName || '',
              isError: tx.isError,
            };
          })
          .slice(0, 50);

        setTransactions(processed);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setTxLoading(false);
      }
    }

    fetchTransactions();
  }, [campaign?.owner]);

  const handleDonate = async (e) => {
    e.preventDefault();
    setDonationError('');
    if (!donationEth || isNaN(Number(donationEth)) || Number(donationEth) <= 0) {
      setDonationError('Please enter a valid ETH donation amount.');
      return;
    }

    try {
      await donateAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'donate',
        args: [campaignId],
        value: parseEther(donationEth),
      });
      setDonationEth('');
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      console.error('Donation error:', err);
      setDonationError(err.shortMessage || err.message || 'Donation transaction failed.');
    }
  };

  const handleDeactivate = async () => {
    setDeactivateError('');
    const confirmed = window.confirm('Are you sure? This will permanently deactivate this campaign');
    if (!confirmed) return;

    try {
      await deactivateAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'deactivateCampaign',
        args: [campaignId],
      });
    } catch (err) {
      console.error('Deactivation error:', err);
      setDeactivateError(err.shortMessage || err.message || 'Deactivation transaction failed.');
    }
  };

  if (isLoading || !campaign) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-800 rounded-2xl"></div>
            <div className="h-96 bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = address && campaign.owner.toLowerCase() === address.toLowerCase();

  const raised = formatEther(campaign.raisedAmount || 0n);
  const goal = formatEther(campaign.goalAmount || 0n);
  const goalNum = Number(campaign.goalAmount || 1n);
  const raisedNum = Number(campaign.raisedAmount || 0n);
  const percent = goalNum > 0 ? Math.min(100, Math.round((raisedNum / goalNum) * 100)) : 0;
  const isGoalReached = raisedNum >= goalNum && goalNum > 0;

  const donationUsd = formatUsd(donationEth, ethPrice);
  const badgeType = verification?.badge || 'UNVERIFIED';

  // Trigger celebratory cannons when visiting a campaign that has met its goal!
  const triggerGoalCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#10b981', '#34d399', '#6366f1', '#a855f7', '#f59e0b'],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      {/* Navigation Back */}
      <Link to="/campaigns" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
        ← Back to Campaigns
      </Link>

      {/* TOP VERIFICATION ALERT BANNERS */}
      {!isVerifying && badgeType === 'FLAGGED' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm font-semibold flex items-center gap-3 shadow-xl animate-fadeIn">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="font-extrabold text-rose-200 text-base">
              WARNING: Flagged Campaign Wallet
            </p>
            <p className="text-xs text-rose-300/90 mt-0.5">
              This campaign's wallet has been flagged as high risk. Do not donate without conducting your own due diligence.
            </p>
          </div>
        </div>
      )}

      {!isVerifying && badgeType === 'VERIFIED' && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-3 shadow-md">
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-bold text-emerald-200">Verified Campaign</p>
            <p className="text-xs text-emerald-300/90 mt-0.5">
              This campaign has passed TrustChain's automated wallet risk verification.
            </p>
          </div>
        </div>
      )}

      {/* === TWO-COLUMN LAYOUT === */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN — Campaign Info + Donation + Owner Tools (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Campaign Info Card */}
          <div className="bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Campaign #{id}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {!campaign.isActive ? '🔴 Closed' : isGoalReached ? '🎉 Goal Reached' : '🟢 Active'}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white mt-2">{campaign.title}</h1>
              </div>

              <Link
                to={`/audit/${campaign.owner}`}
                className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-semibold transition-colors self-start sm:self-auto flex items-center gap-2"
              >
                <span>🔍 View Audit Dashboard</span>
              </Link>
            </div>

            {/* Prominent Verification Badge Card (lg size) */}
            {!isVerifying && verification && (
              <VerificationBadge
                badge={verification.badge}
                score={verification.score}
                reason={verification.reason}
                size="lg"
              />
            )}

            {/* Campaign Owner Address */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Campaign Owner Address:</span>
              <a
                href={`https://sepolia.etherscan.io/address/${campaign.owner}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 font-semibold hover:underline break-all"
              >
                {campaign.owner}
              </a>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">About this Campaign</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">{campaign.description}</p>
            </div>

            {/* IPFS Hash */}
            {campaign.ipfsHash && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>IPFS Metadata Hash:</span>
                <span className="text-indigo-400 font-semibold">{campaign.ipfsHash}</span>
              </div>
            )}

            {/* Progress Metrics */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-2xl font-black text-emerald-400">{raised} ETH</span>
                  {ethPrice > 0 && (
                    <span className="text-sm text-slate-400 ml-2">({formatUsd(raised, ethPrice)})</span>
                  )}
                  <span className="text-slate-400 text-xs font-medium ml-2">of {goal} ETH goal</span>
                </div>
                <span className="text-indigo-400 font-bold text-sm">{percent}% Funded</span>
              </div>

              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Goal</span>
                  <p className="text-base font-bold text-white mt-0.5">{goal} ETH</p>
                  {ethPrice > 0 && <p className="text-[10px] text-slate-400">{formatUsd(goal, ethPrice)}</p>}
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Raised</span>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{raised} ETH</p>
                  {ethPrice > 0 && <p className="text-[10px] text-slate-400">{formatUsd(raised, ethPrice)}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* DONATION SECTION */}
          <div className="bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>💳</span>
                <span>Make a Transparent Donation</span>
              </h2>

              <Link
                to="/check"
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  badgeType === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500/60 animate-pulse shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span>🛡️ Check Wallet Risk First</span>
              </Link>
            </div>

            {/* Block donation form if FLAGGED, INACTIVE, or GOAL REACHED */}
            {!campaign.isActive ? (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <span className="text-3xl">🔴</span>
                <h3 className="text-base font-bold text-slate-300">Campaign Deactivated</h3>
                <p className="text-xs text-slate-500">This campaign has been closed by the owner and can no longer receive donations.</p>
              </div>
            ) : isGoalReached ? (
              <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-950 to-indigo-500/10 border-2 border-emerald-500/50 text-center space-y-4 shadow-2xl relative overflow-hidden group">
                {/* Floating celebratory icon */}
                <div className="inline-block p-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-4xl animate-bounce">
                  🎉
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-emerald-300 tracking-tight">
                    Target Goal Successfully Reached!
                  </h3>
                  <p className="text-xs text-emerald-400/90 max-w-md mx-auto leading-relaxed font-medium mt-1">
                    This campaign has met its full funding goal of <span className="font-extrabold text-white">{goal} ETH</span>. Thank you to all donors — donations are now complete and closed!
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={triggerGoalCelebration}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <span>🎊 Celebrate Achievement!</span>
                  </button>
                </div>
              </div>
            ) : badgeType === 'FLAGGED' ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                <span className="text-4xl">🚫</span>
                <h3 className="text-lg font-bold text-rose-200">Donations Blocked for Flagged Campaign</h3>
                <p className="text-xs text-rose-300/80 max-w-md mx-auto leading-relaxed">
                  This campaign's owner wallet failed security risk checks or is blacklisted on CryptoScamDB. Direct donations are disabled for donor safety.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDonate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Donation Amount (ETH)</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter any amount in ETH (e.g. 0.001, 0.5, 10)"
                      value={donationEth}
                      onChange={(e) => setDonationEth(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isDonatePending || isDonateConfirming}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                    >
                      {isDonatePending || isDonateConfirming ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Donate Now</span>
                      )}
                    </button>
                  </div>
                  {donationEth && Number(donationEth) > 0 && ethPrice > 0 && (
                    <p className="text-xs text-emerald-400 font-medium pl-1">
                      ≈ {donationUsd} USD
                      <span className="text-slate-500 ml-2">(1 ETH = ${ethPrice.toLocaleString()})</span>
                    </p>
                  )}
                </div>

                {donationError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-medium">
                    ⚠️ {donationError}
                  </p>
                )}

                {/* Donation Pending */}
                {(isDonatePending || isDonateConfirming) && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                    <span className="text-xl">⏳</span>
                    <div className="text-xs">
                      <p className="font-bold text-indigo-200">
                        {isDonatePending ? 'Confirm donation in your wallet...' : 'Waiting for block confirmation...'}
                      </p>
                      {donateTxHash && <p className="text-indigo-400 font-mono mt-0.5">Tx: {donateTxHash.slice(0, 10)}...{donateTxHash.slice(-8)}</p>}
                    </div>
                  </div>
                )}

                {/* Donation Success */}
                {isDonateSuccess && donateTxHash && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 animate-fadeIn">
                    <p className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <span>🎉</span> Thank You! Your Donation Has Been Received On-Chain.
                    </p>
                    <p className="text-xs text-emerald-400">
                      Transaction Hash:{' '}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${donateTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-mono font-semibold"
                      >
                        {donateTxHash.slice(0, 12)}...{donateTxHash.slice(-8)}
                      </a>
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* DANGER ZONE: Deactivate Campaign (Campaign Owner Only) */}
          {isOwner && campaign.isActive && (
            <div className="bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-rose-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-rose-300 flex items-center gap-2">
                    <span>🛑</span> Danger Zone
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deactivating this campaign will permanently close donations on-chain.
                  </p>
                </div>
              </div>

              {deactivateError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-medium">
                  ⚠️ {deactivateError}
                </p>
              )}

              {(isDeactivatePending || isDeactivateConfirming) && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                  <span className="text-xl">⏳</span>
                  <div className="text-xs">
                    <p className="font-bold text-rose-200">
                      {isDeactivatePending ? 'Confirm deactivation in your wallet...' : 'Deactivating campaign on-chain...'}
                    </p>
                    {deactivateTxHash && (
                      <p className="text-rose-400 font-mono mt-0.5">Tx: {deactivateTxHash.slice(0, 10)}...{deactivateTxHash.slice(-8)}</p>
                    )}
                  </div>
                </div>
              )}

              {isDeactivateSuccess && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-bold">
                  🎉 Campaign Deactivated! Redirecting to campaigns page...
                </div>
              )}

              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivatePending || isDeactivateConfirming}
                className="w-full py-3 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-400 border border-rose-500/50 hover:border-rose-500 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Deactivate Campaign
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN — Transaction History (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-xl sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📜</span> Contract Transactions
              </h3>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded">
                {transactions.length} txs
              </span>
            </div>

            {txLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                    <div className="h-px bg-slate-800/50 mt-2"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No transactions found for this contract.</p>
            ) : (
              <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                {transactions.map((tx, i) => (
                  <div key={i} className="p-3 rounded-xl hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tx.type === 'Donation'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.type === 'Disbursement'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : tx.type === 'Campaign Deactivated'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : tx.type === 'Campaign Created'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {tx.type}
                      </span>
                      {tx.value > 0 && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-white">{tx.value.toFixed(4)} ETH</span>
                          {ethPrice > 0 && (
                            <span className="text-[10px] text-slate-500 ml-1">({formatUsd(tx.value, ethPrice)})</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-0.5">
                      <p>
                        From:{' '}
                        <span className="text-slate-400 font-mono">{tx.from.slice(0, 8)}...{tx.from.slice(-6)}</span>
                      </p>
                      {tx.date && (
                        <p>{tx.date.toLocaleDateString()} {tx.date.toLocaleTimeString()}</p>
                      )}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline font-mono block"
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Etherscan Link */}
            <div className="pt-4 border-t border-slate-800 mt-4">
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:underline font-semibold flex items-center gap-1"
              >
                View all on Etherscan →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
