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
        colors: ['#34c759', '#0071e3', '#ff9500', '#5856d6'],
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-6 animate-apple-fade-in">
      <div className="space-y-2">
        <span className="caption-label px-3 py-1 rounded-full bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)] inline-block">
          On-Chain Deployment Wizard
        </span>
        <h1 className="section-title text-[var(--text-primary)]">Deploy Smart Contract Campaign</h1>
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-normal">
          Register a transparent, non-reentrant crowdfunding campaign on Ethereum Sepolia testnet.
        </p>
      </div>

      {!isConnected ? (
        <div className="apple-glass p-8 sm:p-10 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[var(--apple-blue-tint)] flex items-center justify-center text-xl mx-auto text-[var(--apple-blue)]">
            🔒
          </div>
          <h2 className="headline text-[var(--text-primary)]">Wallet Not Connected</h2>
          <p className="text-[var(--text-secondary)] text-xs max-w-md mx-auto font-normal">
            Connect your Web3 wallet first to deploy a campaign on the TrustChain smart contract.
          </p>
          <div className="flex justify-center pt-2">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="apple-glass p-6 sm:p-8 rounded-3xl space-y-5 shadow-xl">
          {/* Campaign Title */}
          <div className="space-y-1.5">
            <label className="caption-label text-[var(--text-muted)]">Campaign Title *</label>
            <input
              type="text"
              required
              disabled={isPending || isConfirming || isSuccess}
              placeholder="e.g. Clean Water & Sanitation Initiative"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full apple-inset rounded-2xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] disabled:opacity-50 font-semibold"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="caption-label text-[var(--text-muted)]">Description *</label>
            <textarea
              required
              rows={4}
              disabled={isPending || isConfirming || isSuccess}
              placeholder="Provide a detailed explanation of your campaign, goals, and fund allocation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full apple-inset rounded-2xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] disabled:opacity-50 font-normal leading-relaxed"
            />
          </div>

          {/* Funding Goal */}
          <div className="space-y-1.5">
            <label className="caption-label text-[var(--text-muted)]">Funding Goal (ETH) *</label>
            <input
              type="text"
              inputMode="decimal"
              required
              disabled={isPending || isConfirming || isSuccess}
              placeholder="Enter ETH amount (e.g. 0.5, 10, 100)"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="w-full apple-inset rounded-2xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] disabled:opacity-50 font-semibold"
            />
            {goalAmount && Number(goalAmount) > 0 && ethPrice > 0 && (
              <p className="text-xs text-[var(--apple-green)] font-semibold pl-1">
                ≈ {goalUsd} USD
                <span className="text-[var(--text-muted)] ml-2 font-normal">(1 ETH = ${ethPrice.toLocaleString()})</span>
              </p>
            )}
          </div>

          {/* IPFS Hash */}
          <div className="space-y-1.5">
            <label className="caption-label text-[var(--text-muted)] flex items-center justify-between">
              <span>IPFS Document Hash</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal lowercase">(optional cryptographic proof)</span>
            </label>
            <input
              type="text"
              disabled={isPending || isConfirming || isSuccess}
              placeholder="e.g. QmXoypizjW3WknFiJn..."
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
              className="w-full apple-inset rounded-2xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] disabled:opacity-50 font-mono"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs text-[var(--apple-red)] bg-[var(--apple-red-tint)] p-3.5 rounded-2xl border border-[var(--apple-red-border)] font-medium">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Pending / Confirming Spinner State */}
          {(isPending || isConfirming) && (
            <div className="p-4 rounded-2xl bg-[var(--apple-blue-tint)] border border-[var(--apple-blue-border)] flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[var(--apple-blue)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-xs">
                <p className="font-bold text-[var(--apple-blue)]">
                  {isPending ? 'Confirm transaction in your wallet...' : 'Waiting for block confirmation...'}
                </p>
                {hash && <p className="text-[var(--text-muted)] font-mono mt-0.5">Tx: {hash.slice(0, 10)}...{hash.slice(-8)}</p>}
              </div>
            </div>
          )}

          {/* Success State */}
          {isSuccess && hash && (
            <div className="p-4 rounded-2xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] space-y-1 animate-apple-fade-in">
              <p className="text-xs font-bold text-[var(--apple-green)]">✓ Campaign Registered On-Chain!</p>
              <p className="text-xs text-[var(--text-secondary)] font-normal">
                Redirecting to campaigns matrix in 2.5 seconds...
              </p>
              <p className="text-xs text-[var(--apple-blue)] pt-1">
                TxHash:{' '}
                <a
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-mono font-semibold"
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
            className="w-full py-3.5 rounded-full bg-[var(--apple-green)] hover:bg-[var(--apple-green-hover)] disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer apple-press"
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
