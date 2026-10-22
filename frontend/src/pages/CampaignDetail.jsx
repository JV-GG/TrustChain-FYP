import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { useEthPrice, formatUsd } from '../hooks/useEthPrice';
import { verifyCampaign } from '../services/campaignVerifier';
import VerificationBadge from '../components/VerificationBadge';
import { AlertIcon, BlockedIcon, CheckIcon, Notice, Progress, Spinner } from '../components/ui';
import { signalPoints } from '../lib/risk';
import { formatDate, isGoalReached as goalReached, percentFunded, plural, shortAddr, timeAgo } from '../lib/format';

const PRESETS = ['0.001', '0.01', '0.05', '0.1'];

const EVENT_DOT = {
  Donation: 'var(--accent)',
  Disbursement: 'var(--ink)',
  'Campaign Deactivated': 'var(--red)',
  'Campaign Created': 'var(--ink-3)',
};

export default function CampaignDetail() {
  const { id } = useParams();
  const campaignId = BigInt(id || 1);
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
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
        if (prev.some((t) => t.hash.toLowerCase() === donateTxHash.toLowerCase())) {
          return prev.map((t) =>
            t.hash.toLowerCase() === donateTxHash.toLowerCase() ? { ...t, isPending: !isDonateSuccess } : t
          );
        }
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

          const fnName = (tx.functionName || '').toLowerCase();
          let type = 'Contract Call';
          if (fnName.includes('donate')) {
            type = 'Donation';
          } else if (fnName.includes('disburse')) {
            type = 'Disbursement';
            // Disbursements carry no msg.value; read the amount from calldata
            if (tx.input && tx.input.length >= 138) {
              try {
                valEth = Number(formatEther(BigInt('0x' + tx.input.slice(74, 138))));
              } catch {
                // Ignore parse error
              }
            }
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
            date: tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000) : null,
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

  useEffect(() => {
    if (isDisburseSuccess) {
      refetch();
      fetchTransactions();
    }
  }, [isDisburseSuccess, refetch, fetchTransactions]);

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
        if (log.args?.campaignId !== undefined && log.args.campaignId !== campaignId) return;
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
        colors: ['#0f6b47', '#4cc38a', '#111613', '#d99a2b'],
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
      const t = setTimeout(() => navigate('/campaigns'), 2000);
      return () => clearTimeout(t);
    }
  }, [isDeactivateSuccess, navigate]);

  const handleDonate = async (e) => {
    e.preventDefault();
    setDonationError('');
    if (!address) {
      openConnectModal?.();
      return;
    }
    if (!donationEth || isNaN(Number(donationEth)) || Number(donationEth) <= 0) {
      setDonationError('Enter an amount greater than 0.');
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
      setDisburseError('Enter an amount greater than 0.');
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
    const confirmed = window.confirm('Close this campaign for good? It will stop taking donations and cannot be reopened.');
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
      <div className="page pt-8 pb-24 flex flex-col gap-8" aria-busy="true">
        <span className="skeleton h-4 w-32" />
        <span className="skeleton h-12 w-2/3" />
        <div className="flex flex-wrap gap-8">
          <span className="skeleton h-96 flex-[999_1_560px]" />
          <span className="skeleton h-96 flex-[1_1_340px]" />
        </div>
      </div>
    );
  }

  const isOwner = address && campaign.owner.toLowerCase() === address.toLowerCase();

  const raised = formatEther(campaign.raisedAmount || 0n);
  const goal = formatEther(campaign.goalAmount || 0n);
  const percent = percentFunded(campaign.raisedAmount, campaign.goalAmount);
  const isGoalReached = goalReached(campaign.raisedAmount, campaign.goalAmount);

  const raisedWei = campaign.raisedAmount || 0n;
  const disbursedWei = campaign.disbursedAmount || 0n;
  const availableWei = raisedWei > disbursedWei ? raisedWei - disbursedWei : 0n;
  const availableEth = formatEther(availableWei);
  const disbursedEth = formatEther(disbursedWei);

  const donationUsd = formatUsd(donationEth, ethPrice);
  const badgeType = verification?.badge || 'UNVERIFIED';
  const donateBusy = isDonatePending || isDonateConfirming;
  const donationCount = displayTransactions.filter((t) => t.type === 'Donation').length;
  const createdAt = campaign.createdAt ? new Date(Number(campaign.createdAt) * 1000) : null;

  return (
    <div className="page pt-8 pb-24 flex flex-col gap-8">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)] flex gap-2 items-center">
        <Link to="/campaigns" className="text-[var(--ink-2)] no-underline hover:underline py-3">Campaigns</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--ink)]">#{String(id).padStart(2, '0')}</span>
      </nav>

      <div className="flex flex-col gap-4 max-w-[52rem]">
        <div className="flex flex-wrap gap-2.5 items-center">
          {isVerifying ? (
            <span className="skeleton h-[26px] w-36 rounded-full" aria-label="Checking creator wallet" />
          ) : (
            verification && <VerificationBadge badge={verification.badge} score={verification.score} reason={verification.reason} size="lg" />
          )}
          <span className="badge tone-outline text-[13px] px-3 py-[5px] font-medium">
            {!campaign.isActive ? 'Closed' : isGoalReached ? 'Goal reached' : 'Raising'}
          </span>
        </div>
        <h1 className="h1">{campaign.title}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--ink-2)]">
          <span>
            Creator{' '}
            <a href={`https://sepolia.etherscan.io/address/${campaign.owner}`} target="_blank" rel="noreferrer" className="mono text-[var(--ink)] no-underline hover:underline">
              {shortAddr(campaign.owner, 8, 6)}
            </a>
          </span>
          {campaign.ipfsHash && (
            <span>
              IPFS <span className="mono text-[var(--ink)]" title={campaign.ipfsHash}>{shortAddr(campaign.ipfsHash, 6, 5)}</span>
            </span>
          )}
          {createdAt && <span>Created {formatDate(createdAt)}</span>}
        </div>
      </div>

      {!isVerifying && badgeType === 'FLAGGED' && (
        <Notice tone="error" title="This creator's wallet is flagged">
          {verification?.reason}. Donations to this campaign are blocked.
        </Notice>
      )}

      {/* Phones get the donate card straight after the title; from lg it sits in the right column.
          The auto/1fr rows keep the right column packed while the story spans both rows. */}
      <div className="grid gap-x-8 gap-y-8 lg:gap-y-4 items-start lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:grid-rows-[auto_1fr]">
        <section aria-label="Donate" className="card-raised p-6 flex flex-col gap-5 min-w-0 lg:col-start-2 lg:row-start-1">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[34px] font-bold tracking-[-0.03em]">{Number(raised).toFixed(4)} ETH</span>
              <span className="text-[15px] text-[var(--ink-3)]">of {goal}</span>
            </div>
            <Progress percent={percent} />
            <div className="flex justify-between text-sm text-[var(--ink-2)]">
              <span>{percent}% funded</span>
              <span>
                {ethPrice > 0 ? formatUsd(raised, ethPrice) : plural(donationCount, 'donation')}
              </span>
            </div>
          </div>

          {!campaign.isActive ? (
            <Notice tone="pending" title="This campaign is closed">The creator closed it, so it can no longer take donations.</Notice>
          ) : isGoalReached ? (
            <Notice tone="success" title="Goal reached">This campaign raised its full {goal} ETH. Thank you to everyone who gave.</Notice>
          ) : badgeType === 'FLAGGED' ? (
            <div className="rounded-[10px] p-4 bg-[var(--red-tint)] text-[var(--red)] flex gap-3">
              <BlockedIcon size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p className="m-0 font-semibold">Donations blocked</p>
                <p className="m-0 mt-1 text-[var(--ink-body)]">The creator's wallet failed the risk check or is on CryptoScamDB.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDonate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2.5">
                <label htmlFor="donation-amount" className="field-label">Amount</label>
                <div className="field-group min-h-[52px]">
                  <input
                    id="donation-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={donationEth}
                    onChange={(e) => setDonationEth(e.target.value)}
                    className="text-xl font-semibold"
                    disabled={donateBusy}
                  />
                  <span className="text-[15px] text-[var(--ink-3)] font-medium">ETH</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDonationEth(preset)}
                      aria-pressed={donationEth === preset}
                      className={`btn px-2 text-[13px] font-medium ${donationEth === preset ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                {donationEth && Number(donationEth) > 0 && ethPrice > 0 && (
                  <p className="m-0 text-[13px] text-[var(--ink-2)]">≈ {donationUsd} at ${ethPrice.toLocaleString()} per ETH</p>
                )}
              </div>

              <button type="submit" disabled={donateBusy} className="btn btn-primary btn-xl w-full">
                {donateBusy ? (
                  <>
                    <Spinner />
                    {isDonatePending ? 'Confirm in your wallet…' : 'Waiting for the block…'}
                  </>
                ) : !address ? (
                  'Connect wallet to donate'
                ) : (
                  `Donate${donationEth && Number(donationEth) > 0 ? ` ${donationEth} ETH` : ''}`
                )}
              </button>

              {donationError && <Notice tone="error">{donationError}</Notice>}

              {isDonateSuccess && donateTxHash && (
                <Notice tone="success" title="Donation received">
                  Recorded in{' '}
                  <a href={`https://sepolia.etherscan.io/tx/${donateTxHash}`} target="_blank" rel="noreferrer" className="link mono font-normal">
                    {shortAddr(donateTxHash, 10, 6)}
                  </a>
                </Notice>
              )}

              <p className="m-0 text-[13px] leading-normal text-[var(--ink-2)]">
                Your ETH goes to the escrow contract, not the creator. They can only withdraw through a logged disbursement.
              </p>
            </form>
          )}
        </section>

        <div className="@container min-w-0 flex flex-col gap-8 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          {/* Once the main column is wide enough, the story and the risk report sit side by side */}
          <div className="grid gap-8 items-start @min-[60rem]:grid-cols-2">
            <section className="flex flex-col gap-3">
              <h2 className="h3">About this campaign</h2>
              <p className="m-0 max-w-[72ch] text-base leading-[1.7] text-[var(--ink-body)] whitespace-pre-line">{campaign.description}</p>
            </section>

            <RiskReportCard verification={verification} loading={isVerifying} owner={campaign.owner} />
          </div>

          <section className="flex flex-col gap-3.5">
            <div className="flex justify-between items-baseline gap-3 flex-wrap">
              <h2 className="h3 flex items-center gap-2.5">
                Contract ledger
                <span className="badge tone-verified text-[11px]"><span className="dot" />Live</span>
              </h2>
              <Link to={`/audit/campaign/${id}`} className="link text-sm py-2.5">Open audit trail →</Link>
            </div>
            <div className="card overflow-x-auto">
              {txLoading && displayTransactions.length === 0 ? (
                <div className="p-5 flex flex-col gap-3" aria-busy="true">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="skeleton h-5 w-full" />
                  ))}
                </div>
              ) : displayTransactions.length === 0 ? (
                <p className="m-0 p-8 text-center text-sm text-[var(--ink-3)]">No transactions for this campaign yet.</p>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="ledger min-w-[560px]">
                    <thead>
                      <tr>
                        <th scope="col">Event</th>
                        <th scope="col">From</th>
                        <th scope="col" className="num">Amount</th>
                        <th scope="col">Tx</th>
                        <th scope="col" className="num">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayTransactions.map((tx) => (
                        <tr key={tx.hash}>
                          <td>
                            <span className="inline-flex items-center gap-2 font-medium whitespace-nowrap">
                              <span className="w-2 h-2 rounded-sm" style={{ background: EVENT_DOT[tx.type] || 'var(--ink-3)' }} />
                              {tx.type}
                              {tx.isPending && <span className="badge tone-caution text-[11px]">Confirming</span>}
                            </span>
                          </td>
                          <td className="mono text-[13px] text-[var(--ink-2)] whitespace-nowrap">{shortAddr(tx.from)}</td>
                          <td className="num font-semibold whitespace-nowrap">
                            {tx.value > 0 ? `${tx.type === 'Disbursement' ? '−' : '+'}${tx.value.toFixed(4)} ETH` : '—'}
                          </td>
                          <td>
                            <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="link mono text-[13px] font-normal">
                              {shortAddr(tx.hash, 6, 4)} ↗
                            </a>
                          </td>
                          <td className="num text-[var(--ink-3)] whitespace-nowrap">{tx.date ? timeAgo(tx.date) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="min-w-0 flex flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <section aria-label="Escrow vault" className="card p-6 flex flex-col gap-3.5">
            <h2 className="m-0 text-base font-semibold">Escrow vault</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="well p-3.5 flex flex-col gap-0.5">
                <span className="text-[13px] text-[var(--ink-3)]">Held</span>
                <span className="text-lg font-bold text-[var(--accent)] whitespace-nowrap">
                  {Number(availableEth).toFixed(4)} <span className="text-sm">ETH</span>
                </span>
              </div>
              <div className="well p-3.5 flex flex-col gap-0.5">
                <span className="text-[13px] text-[var(--ink-3)]">Disbursed</span>
                <span className="text-lg font-bold whitespace-nowrap">
                  {Number(disbursedEth).toFixed(4)} <span className="text-sm">ETH</span>
                </span>
              </div>
            </div>

            {isOwner ? (
              Number(availableEth) > 0 ? (
                <form onSubmit={handleDisburse} className="flex flex-col gap-3 pt-1">
                  <label htmlFor="disburse-amount" className="field-label">Withdraw to your wallet</label>
                  <div className="flex gap-2">
                    <div className="field-group flex-1 min-w-0">
                      <input
                        id="disburse-amount"
                        type="text"
                        inputMode="decimal"
                        placeholder={`Up to ${availableEth}`}
                        value={disburseAmountEth}
                        onChange={(e) => setDisburseAmountEth(e.target.value)}
                        disabled={isDisbursePending || isDisburseConfirming}
                      />
                      <button type="button" onClick={() => setDisburseAmountEth(availableEth)} className="link bg-transparent border-0 cursor-pointer text-sm font-[inherit] min-h-11">
                        Max
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isDisbursePending || isDisburseConfirming} className="btn btn-primary w-full">
                    {isDisbursePending || isDisburseConfirming ? (
                      <>
                        <Spinner />
                        Disbursing…
                      </>
                    ) : (
                      'Disburse funds'
                    )}
                  </button>
                  {disburseError && <Notice tone="error">{disburseError}</Notice>}
                  {isDisburseSuccess && <Notice tone="success">Funds sent from escrow to your wallet.</Notice>}
                </form>
              ) : (
                <p className="m-0 text-[13px] text-[var(--ink-3)]">Nothing to withdraw yet.</p>
              )
            ) : (
              <p className="m-0 text-[13px] text-[var(--ink-3)]">Only the creator wallet can withdraw, and every withdrawal shows up in the ledger.</p>
            )}
          </section>

          <Link
            to={`/check?address=${campaign.owner}`}
            className="card flex justify-between items-center min-h-[52px] px-5 text-sm font-semibold no-underline text-[var(--ink)] hover:border-[var(--rule-strong)]"
          >
            Check this creator yourself
            <span aria-hidden="true">→</span>
          </Link>

          {isOwner && campaign.isActive && (
            <section aria-label="Close campaign" className="card p-6 flex flex-col gap-3 border-[var(--red-tint)]">
              <h2 className="m-0 text-base font-semibold">Close this campaign</h2>
              <p className="m-0 text-[13px] leading-normal text-[var(--ink-2)]">Stops new donations for good. Funds already in escrow stay withdrawable.</p>
              {deactivateError && <Notice tone="error">{deactivateError}</Notice>}
              {(isDeactivatePending || isDeactivateConfirming) && (
                <Notice tone="pending">
                  {isDeactivatePending ? 'Confirm in your wallet…' : 'Closing the campaign on-chain…'}
                </Notice>
              )}
              {isDeactivateSuccess && <Notice tone="success">Campaign closed. Taking you back to campaigns…</Notice>}
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivatePending || isDeactivateConfirming || isDeactivateSuccess}
                className="btn btn-danger w-full"
              >
                Close campaign
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskReportCard({ verification, loading, owner }) {
  const signals = verification?.report?.signals || [];

  return (
    <section aria-label="Creator risk report" className="card overflow-hidden">
      <div className="px-6 py-[22px] flex flex-wrap gap-5 justify-between items-center border-b border-[var(--rule-soft)]">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-lg font-semibold tracking-[-0.02em]">Creator risk report</h2>
          <span className="text-sm text-[var(--ink-2)]">Checks run on the creator wallet's Sepolia history.</span>
        </div>
        {loading ? (
          <span className="skeleton h-10 w-20" />
        ) : (
          verification && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[40px] font-bold tracking-[-0.03em] leading-none">{verification.score}</span>
              <span className="text-sm text-[var(--ink-3)]">/ 100</span>
            </div>
          )
        )}
      </div>

      {loading ? (
        <div className="p-6 flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="skeleton h-9 w-full" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <p className="m-0 px-6 py-5 text-sm text-[var(--ink-2)]">{verification?.reason || 'The risk check could not finish. Try again shortly.'}</p>
      ) : (
        signals.map((s) => {
          const pts = signalPoints(s);
          return (
            <div key={s.name} className="grid gap-3.5 items-center px-6 py-3.5 border-b border-[var(--rule-soft)]" style={{ gridTemplateColumns: '20px minmax(0, 1fr) auto' }}>
              {s.isWarning ? (
                <AlertIcon size={18} className="text-[var(--amber)]" />
              ) : (
                <CheckIcon size={18} className="text-[var(--accent)]" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium">{s.name}</span>
                <span className="text-[13px] text-[var(--ink-3)]">{s.description}</span>
              </div>
              <span className={`mono text-[13px] ${pts > 0 ? 'text-[var(--red)]' : 'text-[var(--ink-3)]'}`}>{pts > 0 ? `+${pts}` : '0'}</span>
            </div>
          );
        })
      )}

      <div className="px-6 py-3.5 flex justify-end">
        <Link to={`/check?address=${owner}`} className="link text-sm py-2.5">Run the full check →</Link>
      </div>
    </section>
  );
}
