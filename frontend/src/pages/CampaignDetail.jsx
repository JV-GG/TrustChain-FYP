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
  }, [isDisburseSuccess, refetch, fetchTransactions]);

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
        if (txHash && donor) {
          setTransactions((prev) => {
            if (prev.some((t) => t.hash.toLowerCase() === txHash.toLowerCase())) return prev;
            return [
              {
                hash: txHash,
                from: donor,
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

  // Trigger celebration confetti on successful donation
  useEffect(() => {
    if (isDonateSuccess) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#34c759', '#0071e3', '#ff9500', '#5856d6'],
      });

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--border-color)] rounded-full w-1/3"></div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-[var(--border-color)] rounded-3xl"></div>
            <div className="h-96 bg-[var(--border-color)] rounded-3xl"></div>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-apple-fade-in">
      
      {/* ── Breadcrumb Navigation ── */}
      <Link 
        to="/campaigns" 
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors inline-flex items-center gap-1.5 apple-press"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>Back to Campaigns Matrix</span>
      </Link>

      {/* ── TOP VERIFICATION ALERT BANNERS ── */}
      {!isVerifying && badgeType === 'FLAGGED' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--apple-red-tint)] border border-[var(--apple-red-border)] text-[var(--apple-red)] text-xs font-semibold flex items-center gap-3.5 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[var(--apple-red)] text-white flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[var(--apple-red)] text-sm">
              Flagged Campaign Wallet Alert
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-normal">
              This campaign owner's wallet has triggered security risk alerts. Exercise due diligence before depositing funds.
            </p>
          </div>
        </div>
      )}

      {!isVerifying && badgeType === 'VERIFIED' && (
        <div className="p-4 rounded-2xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] text-[var(--apple-green)] text-xs font-semibold flex items-center gap-3.5 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-[var(--apple-green)] text-white flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-[var(--apple-green)]">Verified On-Chain Campaign</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-normal">
              This campaign creator wallet has passed automated on-chain risk verification.
            </p>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN APPLE LAYOUT ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN — Campaign Info + Donation + Owner Tools (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Campaign Info Card */}
          <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--apple-blue-tint)] text-[var(--apple-blue)] border border-[var(--apple-blue-border)]">
                    Campaign #{id}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {!campaign.isActive ? 'Closed' : isGoalReached ? 'Goal Reached' : 'Active'}
                  </span>
                </div>
                <h1 className="section-title text-[var(--text-primary)] mt-2">{campaign.title}</h1>
              </div>

              <Link
                to={`/audit/campaign/${id}`}
                className="text-xs px-3.5 py-2 rounded-full apple-inset text-[var(--text-primary)] hover:border-[var(--apple-blue-border)] font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto apple-press"
              >
                <span>View Campaign Audit</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
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
            <div className="apple-inset p-4 rounded-2xl text-xs font-mono text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-sans font-semibold text-[var(--text-primary)]">Campaign Creator:</span>
              <a
                href={`https://sepolia.etherscan.io/address/${campaign.owner}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--apple-blue)] font-bold hover:underline break-all"
              >
                {campaign.owner}
              </a>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="caption-label text-[var(--text-muted)]">Campaign Overview</span>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line text-xs sm:text-sm font-normal">
                {campaign.description}
              </p>
            </div>

            {/* IPFS Hash */}
            {campaign.ipfsHash && (
              <div className="apple-inset p-3.5 rounded-2xl text-xs font-mono text-[var(--text-muted)] flex items-center justify-between">
                <span className="font-sans font-semibold text-[var(--text-primary)]">IPFS Metadata Hash:</span>
                <span className="text-[var(--apple-blue)] font-medium">{campaign.ipfsHash}</span>
              </div>
            )}

            {/* Progress Metrics */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--apple-green)]">{raised} ETH</span>
                  {ethPrice > 0 && (
                    <span className="text-xs text-[var(--text-muted)] font-semibold ml-2">({formatUsd(raised, ethPrice)})</span>
                  )}
                  <span className="text-[var(--text-muted)] text-xs font-medium ml-2">of {goal} ETH goal</span>
                </div>
                <span className="text-[var(--apple-green)] font-bold text-sm">{percent}% Funded</span>
              </div>

              {/* Apple Progress Bar */}
              <div className="w-full bg-[var(--bg-inset)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="bg-gradient-to-r from-[var(--apple-green)] to-[var(--apple-blue)] h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                <div className="apple-inset p-3.5 rounded-2xl">
                  <span className="caption-label text-[var(--text-muted)]">Target Goal</span>
                  <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{goal} ETH</p>
                  {ethPrice > 0 && <p className="text-[11px] text-[var(--text-muted)]">{formatUsd(goal, ethPrice)}</p>}
                </div>
                <div className="apple-inset p-3.5 rounded-2xl">
                  <span className="caption-label text-[var(--apple-green)]">Total Raised</span>
                  <p className="text-lg font-bold text-[var(--apple-green)] mt-0.5">{raised} ETH</p>
                  {ethPrice > 0 && <p className="text-[11px] text-[var(--text-muted)]">{formatUsd(raised, ethPrice)}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ── DONATION SECTION ── */}
          <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <h2 className="headline text-[var(--text-primary)] flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--apple-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Make a Transparent Donation</span>
              </h2>

              <Link
                to="/check"
                className={`text-xs px-3.5 py-2 rounded-full font-semibold transition-all flex items-center gap-1.5 apple-press ${
                  badgeType === 'CAUTION'
                    ? 'bg-[var(--apple-amber-tint)] text-[var(--apple-amber)] border border-[var(--apple-amber-border)]'
                    : 'apple-inset text-[var(--text-secondary)] hover:border-[var(--apple-blue-border)]'
                }`}
              >
                <span>Check Wallet Risk First →</span>
              </Link>
            </div>

            {/* Block donation form if FLAGGED, INACTIVE, or GOAL REACHED */}
            {!campaign.isActive ? (
              <div className="p-6 rounded-2xl apple-inset text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-[var(--apple-red-tint)] text-[var(--apple-red)] flex items-center justify-center mx-auto">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h3 className="headline text-[var(--text-primary)]">Campaign Deactivated</h3>
                <p className="text-xs text-[var(--text-muted)] font-normal">This campaign has been closed by the owner and can no longer receive donations.</p>
              </div>
            ) : isGoalReached ? (
              <div className="p-8 rounded-3xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[var(--apple-green)] text-white flex items-center justify-center mx-auto shadow-md">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <h3 className="headline text-[var(--apple-green)]">
                    Target Goal Successfully Reached!
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed font-normal mt-1">
                    This campaign has met its full funding goal of <span className="font-bold text-[var(--text-primary)]">{goal} ETH</span>. Thank you to all donors!
                  </p>
                </div>
              </div>
            ) : badgeType === 'FLAGGED' ? (
              <div className="p-6 rounded-3xl bg-[var(--apple-red-tint)] border border-[var(--apple-red-border)] text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[var(--apple-red)] text-white flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <h3 className="headline text-[var(--apple-red)]">Donations Blocked for Flagged Campaign</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed font-normal">
                  This campaign's owner wallet failed security risk checks or is blacklisted on CryptoScamDB. Direct donations are disabled for donor safety.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDonate} className="space-y-5">
                <div className="space-y-2.5">
                  <label className="caption-label text-[var(--text-muted)]">Donation Amount (ETH)</label>

                  {/* Quick Preset Amount Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pb-1">
                    {['0.001', '0.01', '0.05', '0.1'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDonationEth(preset)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer apple-press ${
                          donationEth === preset
                            ? 'bg-[var(--apple-blue)] text-white border-[var(--apple-blue)] shadow-sm'
                            : 'apple-inset text-[var(--text-secondary)] hover:border-[var(--apple-blue-border)]'
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
                      className="flex-1 apple-inset rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={isDonatePending || isDonateConfirming}
                      className="px-6 py-3 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer apple-press"
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
                    <p className="text-xs text-[var(--apple-green)] font-semibold pl-1">
                      ≈ {donationUsd} USD
                      <span className="text-[var(--text-muted)] ml-2 font-normal">(1 ETH = ${ethPrice.toLocaleString()})</span>
                    </p>
                  )}
                </div>

                {donationError && (
                  <p className="text-xs text-[var(--apple-red)] bg-[var(--apple-red-tint)] p-3.5 rounded-2xl border border-[var(--apple-red-border)] font-medium">
                    ⚠️ {donationError}
                  </p>
                )}

                {/* Donation Pending */}
                {(isDonatePending || isDonateConfirming) && (
                  <div className="p-4 rounded-2xl bg-[var(--apple-blue-tint)] border border-[var(--apple-blue-border)] flex items-center gap-3">
                    <span className="text-xl">⏳</span>
                    <div className="text-xs">
                      <p className="font-bold text-[var(--apple-blue)]">
                        {isDonatePending ? 'Confirm donation in your wallet...' : 'Waiting for block confirmation...'}
                      </p>
                      {donateTxHash && <p className="text-[var(--text-muted)] font-mono mt-0.5">Tx: {donateTxHash.slice(0, 10)}...{donateTxHash.slice(-8)}</p>}
                    </div>
                  </div>
                )}

                {/* Donation Success */}
                {isDonateSuccess && donateTxHash && (
                  <div className="p-4 rounded-2xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] space-y-1 animate-apple-fade-in">
                    <p className="text-xs font-bold text-[var(--apple-green)] flex items-center gap-2">
                      <span>✓</span> Thank You! Your Donation Has Been Received On-Chain.
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Transaction Hash:{' '}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${donateTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-mono font-semibold text-[var(--apple-blue)]"
                      >
                        {donateTxHash.slice(0, 12)}...{donateTxHash.slice(-8)}
                      </a>
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* ── OWNER MANAGEMENT: Disburse Funds ── */}
          {isOwner && (
            <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-4 border border-[var(--apple-blue-border)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="headline text-[var(--text-primary)] flex items-center gap-2">
                    <span>Vault Escrow Disbursement</span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Withdraw raised donations from the smart contract escrow directly to your creator wallet.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 apple-inset p-4 rounded-2xl text-center">
                <div>
                  <span className="caption-label text-[var(--text-muted)]">Available to Claim</span>
                  <p className="text-xl font-bold text-[var(--apple-green)] mt-0.5">{availableEth} ETH</p>
                </div>
                <div>
                  <span className="caption-label text-[var(--text-muted)]">Already Disbursed</span>
                  <p className="text-xl font-bold text-[var(--apple-blue)] mt-0.5">{disbursedEth} ETH</p>
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
                      className="flex-1 apple-inset rounded-2xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setDisburseAmountEth(availableEth)}
                      className="px-3.5 py-2 rounded-full apple-inset text-xs font-semibold text-[var(--apple-blue)] hover:border-[var(--apple-blue-border)] cursor-pointer apple-press"
                    >
                      Max
                    </button>
                    <button
                      type="submit"
                      disabled={isDisbursePending || isDisburseConfirming}
                      className="px-6 py-2.5 rounded-full bg-[var(--apple-green)] hover:bg-[var(--apple-green-hover)] disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer apple-press"
                    >
                      {isDisbursePending || isDisburseConfirming ? 'Disbursing...' : 'Disburse Funds'}
                    </button>
                  </div>

                  {disburseError && (
                    <p className="text-xs text-[var(--apple-red)] bg-[var(--apple-red-tint)] p-3 rounded-2xl border border-[var(--apple-red-border)] font-medium">
                      ⚠️ {disburseError}
                    </p>
                  )}

                  {isDisburseSuccess && (
                    <div className="p-3.5 rounded-2xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] text-xs text-[var(--apple-green)] font-semibold">
                      ✓ Funds successfully transferred from smart contract to your wallet!
                    </div>
                  )}
                </form>
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-2 font-normal">
                  No available balance to disburse at this time.
                </p>
              )}
            </div>
          )}

          {/* ── DANGER ZONE: Deactivate Campaign ── */}
          {isOwner && campaign.isActive && (
            <div className="apple-glass p-6 sm:p-8 rounded-3xl border border-[var(--apple-red-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="headline text-[var(--apple-red)]">
                    Danger Zone
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Deactivating this campaign will permanently close donations on-chain.
                  </p>
                </div>
              </div>

              {deactivateError && (
                <p className="text-xs text-[var(--apple-red)] bg-[var(--apple-red-tint)] p-3 rounded-2xl border border-[var(--apple-red-border)] font-medium">
                  ⚠️ {deactivateError}
                </p>
              )}

              {(isDeactivatePending || isDeactivateConfirming) && (
                <div className="p-4 rounded-2xl bg-[var(--apple-red-tint)] border border-[var(--apple-red-border)] flex items-center gap-3">
                  <span className="text-xl">⏳</span>
                  <div className="text-xs">
                    <p className="font-bold text-[var(--apple-red)]">
                      {isDeactivatePending ? 'Confirm deactivation in your wallet...' : 'Deactivating campaign on-chain...'}
                    </p>
                    {deactivateTxHash && (
                      <p className="text-[var(--apple-red)] font-mono mt-0.5">Tx: {deactivateTxHash.slice(0, 10)}...{deactivateTxHash.slice(-8)}</p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivatePending || isDeactivateConfirming}
                className="w-full py-3 rounded-full bg-transparent hover:bg-[var(--apple-red-tint)] text-[var(--apple-red)] border border-[var(--apple-red-border)] hover:border-[var(--apple-red)] text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer apple-press"
              >
                Deactivate Campaign
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN — Transaction History (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="apple-glass p-5 sm:p-6 rounded-3xl sticky top-20">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
              <h3 className="headline text-[var(--text-primary)] text-sm flex items-center gap-2">
                <span>Contract Ledger</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--apple-green)] bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-green)] animate-pulse inline-block"></span>
                  Live
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] apple-inset px-2 py-0.5 rounded-full font-bold">
                  {displayTransactions.length} txs
                </span>
              </div>
            </div>

            {txLoading && displayTransactions.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-[var(--border-color)] rounded-full w-3/4"></div>
                    <div className="h-3 bg-[var(--border-color)] rounded-full w-1/2"></div>
                    <div className="h-px bg-[var(--border-color)] mt-2"></div>
                  </div>
                ))}
              </div>
            ) : displayTransactions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">No transactions found for this campaign.</p>
            ) : (
              <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
                {displayTransactions.map((tx, i) => (
                  <div key={i} className="p-3 rounded-2xl hover:bg-[var(--bg-inset)] transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            tx.type === 'Donation'
                              ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)]'
                              : tx.type === 'Disbursement'
                              ? 'bg-[var(--apple-blue-tint)] text-[var(--apple-blue)] border border-[var(--apple-blue-border)]'
                              : tx.type === 'Campaign Deactivated'
                              ? 'bg-[var(--apple-red-tint)] text-[var(--apple-red)] border border-[var(--apple-red-border)]'
                              : tx.type === 'Campaign Created'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'apple-inset text-[var(--text-muted)]'
                          }`}
                        >
                          {tx.type}
                        </span>
                        {tx.isPending && (
                          <span className="text-[9px] font-bold text-[var(--apple-amber)] bg-[var(--apple-amber-tint)] border border-[var(--apple-amber-border)] px-1.5 py-0.5 rounded-full animate-pulse">
                            ⏳ Confirming
                          </span>
                        )}
                      </div>
                      {tx.value > 0 && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{tx.value.toFixed(4)} ETH</span>
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
                        className="text-[var(--apple-blue)] hover:underline font-mono block pt-0.5"
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Etherscan Link */}
            <div className="pt-3 border-t border-[var(--border-color)] mt-3">
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--apple-blue)] hover:underline font-semibold flex items-center justify-between apple-press"
              >
                <span>View Full Contract on Etherscan</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
