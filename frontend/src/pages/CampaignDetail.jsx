import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi';
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
  const [lastSubmittedEth, setLastSubmittedEth] = useState('');
  const [donationError, setDonationError] = useState('');
  const [deactivateError, setDeactivateError] = useState('');

  // Disburse State
  const [disburseAmountEth, setDisburseAmountEth] = useState('');
  const [disburseError, setDisburseError] = useState('');

  // Verification State
  const [verification, setVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Transaction history state
  const [transactions, setTransactions] = useState([]);
  const [optimisticTxs, setOptimisticTxs] = useState([]);
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

  // Optimistically inject user's donation transaction immediately upon wallet submission
  useEffect(() => {
    if (donateTxHash && address) {
      setOptimisticTxs((prev) => {
        if (prev.some((t) => t.hash.toLowerCase() === donateTxHash.toLowerCase())) return prev;
        return [
          {
            hash: donateTxHash,
            from: address,
            to: CONTRACT_ADDRESS,
            value: Number(lastSubmittedEth || 0),
            type: 'Donation',
            date: new Date(),
            isPending: !isDonateSuccess,
          },
          ...prev,
        ];
      });
    }
  }, [donateTxHash, address, lastSubmittedEth, isDonateSuccess]);

  // 4. Disburse Transaction Hook
  const {
    data: disburseTxHash,
    isPending: isDisbursePending,
    writeContractAsync: disburseAsync,
  } = useWriteContract();

  const { isLoading: isDisburseConfirming, isSuccess: isDisburseSuccess } = useWaitForTransactionReceipt({
    hash: disburseTxHash,
  });

  useEffect(() => {
    if (isDisburseSuccess) {
      refetch();
      fetchTransactions();
    }
  }, [isDisburseSuccess]);

  // 5. Fetch Etherscan transactions for this campaign's contract interactions
  const fetchTransactions = useCallback(async () => {
    if (!campaign?.owner || !id) return;
    try {
      const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
      const targetCampaignId = BigInt(id);
      const topic1Hex = '0x' + targetCampaignId.toString(16).padStart(64, '0');

      const [txRes, logRes] = await Promise.all([
        axios.get('https://api.etherscan.io/v2/api', {
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
        }).catch(() => null),
        axios.get('https://api.etherscan.io/v2/api', {
          params: {
            chainid: 11155111,
            module: 'logs',
            action: 'getLogs',
            address: CONTRACT_ADDRESS,
            topic1: topic1Hex,
            startblock: 0,
            endblock: 99999999,
            apikey: apiKey,
          },
          timeout: 10000,
        }).catch(() => null),
      ]);

      const matchingHashes = new Set();
      if (logRes?.data && Array.isArray(logRes.data.result)) {
        logRes.data.result.forEach((log) => {
          if (log.transactionHash) {
            matchingHashes.add(log.transactionHash.toLowerCase());
          }
        });
      }

      let rawTxs = [];
      if (txRes?.data && Array.isArray(txRes.data.result)) {
        rawTxs = txRes.data.result;
      }

      const processed = rawTxs
        .filter((tx) => {
          const txHashLower = (tx.hash || '').toLowerCase();
          if (matchingHashes.has(txHashLower)) return true;

          // Inspect tx input for contract functions accepting _campaignId as 1st param
          if (tx.input && tx.input.length >= 74) {
            try {
              const param1 = BigInt('0x' + tx.input.slice(10, 74));
              if (param1 === targetCampaignId) return true;
            } catch {
              // Ignore parse error
            }
          }

          return false;
        })
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
            isPending: false,
          };
        })
        .slice(0, 50);

      setTransactions(processed);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTxLoading(false);
    }
  }, [campaign?.owner, id]);

  // Real-time polling (every 6 seconds) + initial fetch
  useEffect(() => {
    if (!campaign?.owner) return;
    fetchTransactions();

    const interval = setInterval(() => {
      refetch();
      fetchTransactions();
    }, 6000);

    return () => clearInterval(interval);
  }, [campaign?.owner, fetchTransactions, refetch]);

  // Watch smart contract events in real-time and inject on-chain event logs immediately
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'DonationReceived',
    onLogs(logs) {
      refetch();
      logs.forEach((log) => {
        const txHash = log.transactionHash;
        const donor = log.args?.donor;
        const amount = log.args?.amount ? Number(formatEther(log.args.amount)) : 0;
        const logCampaignId = log.args?.campaignId;

        if (txHash && logCampaignId && BigInt(logCampaignId) === BigInt(id)) {
          setOptimisticTxs((prev) => {
            if (prev.some((t) => t.hash.toLowerCase() === txHash.toLowerCase())) return prev;
            return [
              {
                hash: txHash,
                from: donor || '0x...',
                to: CONTRACT_ADDRESS,
                value: amount,
                type: 'Donation',
                date: new Date(),
                isPending: false,
              },
              ...prev,
            ];
          });
        }
      });
      fetchTransactions();
    },
  });

  // Trigger celebration confetti + direct instant updates when donation succeeds
  useEffect(() => {
    if (isDonateSuccess) {
      if (donateTxHash) {
        setOptimisticTxs((prev) =>
          prev.map((t) =>
            t.hash.toLowerCase() === donateTxHash.toLowerCase() ? { ...t, isPending: false } : t
          )
        );
      }

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#a855f7', '#3b82f6', '#f59e0b'],
      });

      // Direct immediate refetch & transaction reload
      refetch();
      fetchTransactions();

      // Scheduled follow-ups to catch Etherscan API indexing lag
      const t1 = setTimeout(() => {
        refetch();
        fetchTransactions();
      }, 2500);

      const t2 = setTimeout(() => {
        refetch();
        fetchTransactions();
      }, 6000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isDonateSuccess, donateTxHash, refetch, fetchTransactions]);

  // Merge optimistic transactions with Etherscan fetched transactions (deduplicated by tx hash)
  const displayTransactions = [...optimisticTxs, ...transactions].filter(
    (tx, index, self) => index === self.findIndex((t) => t.hash.toLowerCase() === tx.hash.toLowerCase())
  );

  // 6. Deactivation Transaction Hook
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

  const handleDonate = async (e) => {
    e.preventDefault();
    setDonationError('');
    if (!donationEth || isNaN(Number(donationEth)) || Number(donationEth) <= 0) {
      setDonationError('Please enter a valid ETH donation amount.');
      return;
    }

    try {
      setLastSubmittedEth(donationEth);
      await donateAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'donate',
        args: [campaignId],
        value: parseEther(donationEth),
      });
      setDonationEth('');
    } catch (err) {
      console.error('Donation error:', err);
      setDonationError(err.shortMessage || err.message || 'Donation transaction failed.');
    }
  };

  const handleDisburse = async (e) => {
    e.preventDefault();
    setDisburseError('');
    if (!disburseAmountEth || isNaN(Number(disburseAmountEth)) || Number(disburseAmountEth) <= 0) {
      setDisburseError('Please enter a valid ETH disbursement amount.');
      return;
    }

    try {
      await disburseAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'disburseFunds',
        args: [campaignId, parseEther(disburseAmountEth)],
      });
      setDisburseAmountEth('');
    } catch (err) {
      console.error('Disbursement error:', err);
      setDisburseError(err.shortMessage || err.message || 'Disbursement transaction failed.');
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
          <div className="h-8 bg-[var(--border-color)] rounded w-1/3"></div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-[var(--border-color)] rounded-2xl"></div>
            <div className="h-96 bg-[var(--border-color)] rounded-2xl"></div>
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

  const raisedWei = campaign.raisedAmount || 0n;
  const disbursedWei = campaign.disbursedAmount || 0n;
  const availableWei = raisedWei > disbursedWei ? raisedWei - disbursedWei : 0n;
  const availableEth = formatEther(availableWei);
  const disbursedEth = formatEther(disbursedWei);

  const donationUsd = formatUsd(donationEth, ethPrice);
  const badgeType = verification?.badge || 'UNVERIFIED';

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
      <Link to="/campaigns" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-bold transition-colors">
        ← Back to Campaigns
      </Link>

      {/* TOP VERIFICATION ALERT BANNERS */}
      {!isVerifying && badgeType === 'FLAGGED' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-sm font-semibold flex items-center gap-3 shadow-xl animate-fade-in">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="font-extrabold text-rose-700 dark:text-rose-200 text-base">
              WARNING: Flagged Campaign Wallet
            </p>
            <p className="text-xs text-rose-600/90 dark:text-rose-300/90 mt-0.5 font-medium">
              This campaign's wallet has been flagged as high risk. Do not donate without conducting your own due diligence.
            </p>
          </div>
        </div>
      )}

      {!isVerifying && badgeType === 'VERIFIED' && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3 shadow-md">
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-extrabold text-emerald-800 dark:text-emerald-200">Verified Campaign</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5 font-medium">
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
          <div className="theme-card p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Campaign #{id}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    {!campaign.isActive ? '🔴 Closed' : isGoalReached ? '🎉 Goal Reached' : '🟢 Active'}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mt-2">{campaign.title}</h1>
              </div>

              <Link
                to={`/audit/campaign/${id}`}
                className="text-xs px-3.5 py-2.5 rounded-xl theme-inset text-[var(--text-primary)] hover:text-emerald-600 dark:hover:text-emerald-400 border border-[var(--border-color)] font-extrabold transition-colors flex items-center gap-2"
              >
                <span>🔍 View Campaign Audit</span>
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
            <div className="theme-inset p-4 rounded-xl text-xs font-mono text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-sans font-extrabold text-[var(--text-primary)]">Campaign Owner Address:</span>
              <a
                href={`https://sepolia.etherscan.io/address/${campaign.owner}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline break-all"
              >
                {campaign.owner}
              </a>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider">About this Campaign</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line text-sm font-medium">{campaign.description}</p>
            </div>

            {/* IPFS Hash */}
            {campaign.ipfsHash && (
              <div className="theme-inset p-3.5 rounded-xl text-xs font-mono text-[var(--text-muted)] flex items-center justify-between">
                <span className="font-sans font-extrabold text-[var(--text-primary)]">IPFS Metadata Hash:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{campaign.ipfsHash}</span>
              </div>
            )}

            {/* Progress Metrics */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{raised} ETH</span>
                  {ethPrice > 0 && (
                    <span className="text-sm text-[var(--text-muted)] font-bold ml-2">({formatUsd(raised, ethPrice)})</span>
                  )}
                  <span className="text-[var(--text-muted)] text-xs font-bold ml-2">of {goal} ETH goal</span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{percent}% Funded</span>
              </div>

              <div className="w-full theme-inset h-3.5 rounded-full overflow-hidden p-0.5 border border-[var(--border-color)]">
                <div
                  className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                <div className="theme-inset p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Goal</span>
                  <p className="text-base font-extrabold text-[var(--text-primary)] mt-0.5">{goal} ETH</p>
                  {ethPrice > 0 && <p className="text-[10px] text-[var(--text-muted)]">{formatUsd(goal, ethPrice)}</p>}
                </div>
                <div className="theme-inset p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Total Raised</span>
                  <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{raised} ETH</p>
                  {ethPrice > 0 && <p className="text-[10px] text-[var(--text-muted)]">{formatUsd(raised, ethPrice)}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* DONATION SECTION */}
          <div className="theme-card p-6 sm:p-8 rounded-2xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <span>💳</span>
                <span>Make a Transparent Donation</span>
              </h2>

              <Link
                to="/check"
                className={`text-xs px-3.5 py-2 min-h-[44px] rounded-xl font-extrabold transition-all flex items-center gap-1.5 ${
                  badgeType === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-2 border-amber-500/60'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                <span>🛡️ Check Wallet Risk First</span>
              </Link>
            </div>

            {/* Block donation form if FLAGGED, INACTIVE, or GOAL REACHED */}
            {!campaign.isActive ? (
              <div className="p-6 rounded-2xl theme-inset text-center space-y-2">
                <span className="text-3xl">🔴</span>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">Campaign Deactivated</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">This campaign has been closed by the owner and can no longer receive donations.</p>
              </div>
            ) : isGoalReached ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 shadow-sm relative overflow-hidden group">
                <div className="inline-block p-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-4xl motion-reduce:animate-none animate-pulse-glow transition-transform duration-300 hover:scale-105">
                  🎉
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight">
                    Target Goal Successfully Reached!
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 max-w-md mx-auto leading-relaxed font-semibold mt-1">
                    This campaign has met its full funding goal of <span className="font-extrabold text-[var(--text-primary)]">{goal} ETH</span>. Thank you to all donors — donations are now complete!
                  </p>
                </div>
              </div>
            ) : badgeType === 'FLAGGED' ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                <span className="text-4xl">🚫</span>
                <h3 className="text-lg font-extrabold text-rose-700 dark:text-rose-200">Donations Blocked for Flagged Campaign</h3>
                <p className="text-xs text-rose-800 dark:text-rose-300 max-w-md mx-auto leading-relaxed font-semibold">
                  This campaign's owner wallet failed security risk checks or is blacklisted on CryptoScamDB. Direct donations are disabled for donor safety.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDonate} className="space-y-5">
                <div className="space-y-2.5">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Donation Amount (ETH)</label>

                  {/* Quick Preset Amount Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    {['0.001', '0.01', '0.05', '0.1'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDonationEth(preset)}
                        className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          donationEth === preset
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'theme-inset text-[var(--text-secondary)] hover:border-emerald-500/50'
                        }`}
                      >
                        + {preset} ETH
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter amount in ETH (e.g. 0.001, 0.05)"
                      value={donationEth}
                      onChange={(e) => setDonationEth(e.target.value)}
                      className="flex-1 theme-inset rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={isDonatePending || isDonateConfirming}
                      className="px-6 py-3 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
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
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold pl-1">
                      ≈ {donationUsd} USD
                      <span className="text-[var(--text-muted)] ml-2 font-normal">(1 ETH = ${ethPrice.toLocaleString()})</span>
                    </p>
                  )}
                </div>

                {donationError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-bold">
                    ⚠️ {donationError}
                  </p>
                )}

                {/* Donation Pending */}
                {(isDonatePending || isDonateConfirming) && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                    <span className="text-xl">⏳</span>
                    <div className="text-xs">
                      <p className="font-extrabold text-indigo-700 dark:text-indigo-200">
                        {isDonatePending ? 'Confirm donation in your wallet...' : 'Waiting for block confirmation...'}
                      </p>
                      {donateTxHash && <p className="text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">Tx: {donateTxHash.slice(0, 10)}...{donateTxHash.slice(-8)}</p>}
                    </div>
                  </div>
                )}

                {/* Donation Success */}
                {isDonateSuccess && donateTxHash && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 animate-fade-in">
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <span>🎉</span> Thank You! Your Donation Has Been Received On-Chain.
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Transaction Hash:{' '}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${donateTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-mono font-bold"
                      >
                        {donateTxHash.slice(0, 12)}...{donateTxHash.slice(-8)}
                      </a>
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* OWNER MANAGEMENT: Disburse Funds (Campaign Owner Only) */}
          {isOwner && (
            <div className="theme-card p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl border-indigo-500/30">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <span>💰</span> Owner Management: Disburse Funds
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Withdraw raised donations from the smart contract escrow directly to your personal wallet.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 theme-inset p-4 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Available to Claim</span>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{availableEth} ETH</p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Already Disbursed</span>
                  <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{disbursedEth} ETH</p>
                </div>
              </div>

              {Number(availableEth) > 0 ? (
                <form onSubmit={handleDisburse} className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={`Max: ${availableEth} ETH`}
                      value={disburseAmountEth}
                      onChange={(e) => setDisburseAmountEth(e.target.value)}
                      className="flex-1 theme-inset rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setDisburseAmountEth(availableEth)}
                      className="px-3 py-2.5 rounded-xl theme-card text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50 cursor-pointer"
                    >
                      Max
                    </button>
                    <button
                      type="submit"
                      disabled={isDisbursePending || isDisburseConfirming}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isDisbursePending || isDisburseConfirming ? 'Disbursing...' : 'Disburse Funds'}
                    </button>
                  </div>

                  {disburseError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-bold">
                      ⚠️ {disburseError}
                    </p>
                  )}

                  {isDisburseSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-extrabold">
                      🎉 Funds successfully transferred from smart contract to your wallet!
                    </div>
                  )}
                </form>
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-2 font-medium">
                  No available balance to disburse at this time.
                </p>
              )}
            </div>
          )}

          {/* DANGER ZONE: Deactivate Campaign (Campaign Owner Only) */}
          {isOwner && campaign.isActive && (
            <div className="theme-card p-6 sm:p-8 rounded-2xl border-rose-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-rose-600 dark:text-rose-300 flex items-center gap-2">
                    <span>🛑</span> Danger Zone
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Deactivating this campaign will permanently close donations on-chain.
                  </p>
                </div>
              </div>

              {deactivateError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-bold">
                  ⚠️ {deactivateError}
                </p>
              )}

              {(isDeactivatePending || isDeactivateConfirming) && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                  <span className="text-xl">⏳</span>
                  <div className="text-xs">
                    <p className="font-bold text-rose-700 dark:text-rose-200">
                      {isDeactivatePending ? 'Confirm deactivation in your wallet...' : 'Deactivating campaign on-chain...'}
                    </p>
                    {deactivateTxHash && (
                      <p className="text-rose-600 dark:text-rose-400 font-mono mt-0.5">Tx: {deactivateTxHash.slice(0, 10)}...{deactivateTxHash.slice(-8)}</p>
                    )}
                  </div>
                </div>
              )}

              {isDeactivateSuccess && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 font-extrabold">
                  🎉 Campaign Deactivated! Redirecting to campaigns page...
                </div>
              )}

              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivatePending || isDeactivateConfirming}
                className="w-full py-3 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/50 hover:border-rose-500 text-sm font-extrabold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                Deactivate Campaign
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN — Transaction History (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="theme-card p-5 rounded-2xl shadow-xl sticky top-20">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <span>📜</span> Contract Transactions
              </h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping inline-block"></span>
                  Live
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] theme-inset px-2 py-0.5 rounded font-bold">
                  {displayTransactions.length} txs
                </span>
              </div>
            </div>

            {txLoading && displayTransactions.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-[var(--border-color)] rounded w-3/4"></div>
                    <div className="h-3 bg-[var(--border-color)] rounded w-1/2"></div>
                    <div className="h-px bg-[var(--border-color)] mt-2"></div>
                  </div>
                ))}
              </div>
            ) : displayTransactions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">No transactions found for this campaign.</p>
            ) : (
              <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                {displayTransactions.map((tx, i) => (
                  <div key={i} className="p-3 rounded-xl hover:bg-[var(--border-subtle)]/30 transition-colors border border-transparent hover:border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            tx.type === 'Donation'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : tx.type === 'Disbursement'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : tx.type === 'Campaign Deactivated'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : tx.type === 'Campaign Created'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'theme-inset text-[var(--text-muted)]'
                          }`}
                        >
                          {tx.type}
                        </span>
                        {tx.isPending && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded animate-pulse">
                            ⏳ Confirming...
                          </span>
                        )}
                      </div>
                      {tx.value > 0 && (
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-[var(--text-primary)]">{tx.value.toFixed(4)} ETH</span>
                          {ethPrice > 0 && (
                            <span className="text-[10px] text-[var(--text-muted)] ml-1">({formatUsd(tx.value, ethPrice)})</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-[var(--text-muted)] space-y-0.5">
                      <p>
                        From:{' '}
                        <span className="text-[var(--text-secondary)] font-mono">{tx.from.slice(0, 8)}...{tx.from.slice(-6)}</span>
                      </p>
                      {tx.date && (
                        <p>{tx.date.toLocaleDateString()} {tx.date.toLocaleTimeString()}</p>
                      )}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono block"
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Etherscan Link */}
            <div className="pt-4 border-t border-[var(--border-color)] mt-4">
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold flex items-center gap-1"
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
