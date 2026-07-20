import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import confetti from 'canvas-confetti';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { useEthPrice, formatUsd } from '../hooks/useEthPrice';

export default function CreateCampaign() {
  const { isConnected } = useAccount();
  const { ethPrice } = useEthPrice();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: hash, isPending, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-redirect to /campaigns after successful publication with celebratory confetti!
  useEffect(() => {
    if (isSuccess) {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#a855f7', '#3b82f6', '#f59e0b'],
      });

      const timer = setTimeout(() => {
        navigate('/campaigns');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isPending || isConfirming || isSuccess) return;

    if (!title || !description || !goalAmount) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (isNaN(Number(goalAmount)) || Number(goalAmount) <= 0) {
      setErrorMsg('Please enter a valid positive ETH amount.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createCampaign',
        args: [
          title.trim(),
          description.trim(),
          ipfsHash.trim() || '',
          parseEther(goalAmount),
        ],
      });
    } catch (err) {
      console.error('Failed to create campaign:', err);
      setErrorMsg(err.shortMessage || err.message || 'Transaction rejected or failed.');
    }
  };

  const goalUsd = formatUsd(goalAmount, ethPrice);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Create New Campaign</h1>
        <p className="text-[var(--text-muted)] mt-1 text-sm font-medium">
          Register a transparent, blockchain-verified crowdfunding campaign on Sepolia testnet.
        </p>
      </div>

      {!isConnected ? (
        <div className="theme-card p-8 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="text-4xl">🔌</div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Wallet Not Connected</h2>
          <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto font-medium">
            Please connect your wallet first to create and publish a campaign on the TrustChain smart contract.
          </p>
          <div className="flex justify-center pt-2">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="theme-card p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl">
          {/* Campaign Title */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Campaign Title *</label>
            <input
              type="text"
              required
              disabled={isPending || isConfirming || isSuccess}
              placeholder="e.g. Clean Water & Sanitation Initiative"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full theme-inset rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-semibold"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Description *</label>
            <textarea
              required
              rows={4}
              disabled={isPending || isConfirming || isSuccess}
              placeholder="Provide a detailed explanation of your campaign, goals, and fund allocation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full theme-inset rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-semibold"
            />
          </div>

          {/* Funding Goal */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Funding Goal (ETH) *</label>
            <input
              type="text"
              inputMode="decimal"
              required
              disabled={isPending || isConfirming || isSuccess}
              placeholder="Enter any ETH amount (e.g. 0.5, 10, 100)"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="w-full theme-inset rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-semibold"
            />
            {goalAmount && Number(goalAmount) > 0 && ethPrice > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold pl-1">
                ≈ {goalUsd} USD
                <span className="text-[var(--text-muted)] ml-2 font-normal">(1 ETH = ${ethPrice.toLocaleString()})</span>
              </p>
            )}
          </div>

          {/* IPFS Hash */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
              <span>IPFS Hash</span>
              <span className="text-[11px] text-[var(--text-muted)] font-normal lowercase">(optional — document proof)</span>
            </label>
            <input
              type="text"
              disabled={isPending || isConfirming || isSuccess}
              placeholder="e.g. QmXoypizjW3WknFiJn..."
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
              className="w-full theme-inset rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono text-xs font-semibold"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-bold">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Pending / Confirming Spinner State */}
          {(isPending || isConfirming) && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-xs">
                <p className="font-extrabold text-indigo-700 dark:text-indigo-200">
                  {isPending ? 'Confirm in your wallet...' : 'Waiting for block confirmation...'}
                </p>
                {hash && <p className="text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">Tx: {hash.slice(0, 10)}...{hash.slice(-8)}</p>}
              </div>
            </div>
          )}

          {/* Success State */}
          {isSuccess && hash && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 animate-fade-in">
              <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">🎉 Campaign Successfully Registered On-Chain!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Redirecting to campaigns page in 2.5 seconds...
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 pt-1">
                Transaction Hash:{' '}
                <a
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-mono font-bold"
                >
                  {hash.slice(0, 12)}...{hash.slice(-8)}
                </a>
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || isConfirming || isSuccess}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending || isConfirming
              ? 'Publishing On-Chain...'
              : isSuccess
              ? 'Campaign Registered! Redirecting...'
              : 'Publish Campaign On-Chain'}
          </button>
        </form>
      )}
    </div>
  );
}
