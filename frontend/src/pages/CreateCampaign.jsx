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
        <h1 className="text-3xl font-extrabold text-white">Create New Campaign</h1>
        <p className="text-slate-400 mt-1">
          Register a transparent, blockchain-verified crowdfunding campaign on Sepolia testnet.
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="text-4xl">🔌</div>
          <h2 className="text-xl font-bold text-white">Wallet Not Connected</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Please connect your wallet first to create and publish a campaign on the TrustChain smart contract.
          </p>
          <div className="flex justify-center pt-2">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          {/* Campaign Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Campaign Title *</label>
            <input
              type="text"
              required
              disabled={isPending || isConfirming || isSuccess}
              placeholder="e.g. Clean Water & Sanitation Initiative"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Description *</label>
            <textarea
              required
              rows={4}
              disabled={isPending || isConfirming || isSuccess}
              placeholder="Provide a detailed explanation of your campaign, goals, and fund allocation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Funding Goal */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Funding Goal (ETH) *</label>
            <input
              type="text"
              inputMode="decimal"
              required
              disabled={isPending || isConfirming || isSuccess}
              placeholder="Enter any ETH amount (e.g. 0.5, 10, 100)"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            {goalAmount && Number(goalAmount) > 0 && ethPrice > 0 && (
              <p className="text-xs text-emerald-400 font-medium pl-1">
                ≈ {goalUsd} USD
                <span className="text-slate-500 ml-2">(1 ETH = ${ethPrice.toLocaleString()})</span>
              </p>
            )}
          </div>

          {/* IPFS Hash */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">
              IPFS Hash <span className="text-xs text-slate-500 font-normal">(Optional — for campaign image/document proof)</span>
            </label>
            <input
              type="text"
              disabled={isPending || isConfirming || isSuccess}
              placeholder="e.g. QmXoypizjW3WknFiJn..."
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-medium">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Pending / Confirming Spinner State */}
          {(isPending || isConfirming) && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-xs">
                <p className="font-bold text-indigo-200">
                  {isPending ? 'Confirm in your wallet...' : 'Waiting for block confirmation...'}
                </p>
                {hash && <p className="text-indigo-400 font-mono mt-0.5">Tx: {hash.slice(0, 10)}...{hash.slice(-8)}</p>}
              </div>
            </div>
          )}

          {/* Success State */}
          {isSuccess && hash && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 animate-fadeIn">
              <p className="text-sm font-bold text-emerald-300">🎉 Campaign Successfully Registered On-Chain!</p>
              <p className="text-xs text-emerald-400/90 font-medium">
                Redirecting to campaigns page in 2.5 seconds...
              </p>
              <p className="text-xs text-emerald-400/90 pt-1">
                Transaction Hash:{' '}
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
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
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
