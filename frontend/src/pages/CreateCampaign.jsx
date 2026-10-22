import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import confetti from 'canvas-confetti';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { useEthPrice, formatUsd } from '../hooks/useEthPrice';
import { verifyCampaign } from '../services/campaignVerifier';
import VerificationBadge from '../components/VerificationBadge';
import { EmptyState, Notice, Progress, Spinner } from '../components/ui';
import { shortAddr } from '../lib/format';

const PRECHECK_COPY = {
  VERIFIED: 'Your wallet already passes',
  CAUTION: 'Your wallet will launch with a caution badge',
  UNVERIFIED: 'Your wallet will launch unverified',
  FLAGGED: 'Your wallet is flagged',
};

export default function CreateCampaign() {
  const { isConnected, address } = useAccount();
  const { ethPrice } = useEthPrice();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [precheck, setPrecheck] = useState(null);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Show creators the badge donors will see before they deploy
  useEffect(() => {
    let cancelled = false;
    setPrecheck(null);
    if (!address) return;
    verifyCampaign(address)
      .then((res) => !cancelled && setPrecheck(res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Auto-redirect to /campaigns after successful publication with celebratory confetti!
  useEffect(() => {
    if (isSuccess) {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#0f6b47', '#4cc38a', '#111613', '#d99a2b'],
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
      setErrorMsg('Fill in the title, description and goal.');
      return;
    }

    if (isNaN(Number(goalAmount)) || Number(goalAmount) <= 0) {
      setErrorMsg('Enter a goal greater than 0 ETH.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createCampaign',
        args: [title.trim(), description.trim(), ipfsHash.trim() || '', parseEther(goalAmount)],
      });
    } catch (err) {
      console.error('Failed to create campaign:', err);
      setErrorMsg(err.shortMessage || err.message || 'Transaction rejected or failed.');
    }
  };

  const busy = isPending || isConfirming || isSuccess;
  const goalUsd = formatUsd(goalAmount, ethPrice);

  return (
    <div className="page pt-8 pb-24 flex flex-col gap-8">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)] flex gap-2 items-center">
        <Link to="/campaigns" className="text-[var(--ink-2)] no-underline hover:underline py-3">Campaigns</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--ink)]">Launch</span>
      </nav>

      <div className="flex flex-col gap-2.5 max-w-[44rem]">
        <h1 className="h1">Launch a campaign</h1>
        <p className="lead">One transaction creates your vault on the escrow contract. Title and goal can't be edited after deploy.</p>
      </div>

      {!isConnected ? (
        <EmptyState title="Connect a wallet to launch" action={<ConnectWalletButton />}>
          Your wallet becomes the campaign's creator, and its history sets the badge donors see.
        </EmptyState>
      ) : (
        <div className="flex flex-wrap gap-8 items-start">
          <form onSubmit={handleSubmit} className="card flex-[999_1_560px] min-w-0 p-6 sm:p-8 flex flex-col gap-[26px]">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="field-label">Title</label>
              <input
                id="title"
                type="text"
                required
                disabled={busy}
                placeholder="e.g. Clean Water & Sanitation Initiative"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="desc" className="field-label">Description</label>
              <textarea
                id="desc"
                required
                rows={6}
                disabled={busy}
                placeholder="What the money is for, who it reaches, and how you'll split withdrawals."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="field"
                aria-describedby="desc-hint"
              />
              <span id="desc-hint" className="text-[13px] text-[var(--ink-3)]">Donors read this next to your risk score. Name specific costs.</span>
            </div>

            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
              <div className="flex flex-col gap-2">
                <label htmlFor="goal" className="field-label">Funding goal</label>
                <div className="field-group">
                  <input
                    id="goal"
                    type="text"
                    inputMode="decimal"
                    required
                    disabled={busy}
                    placeholder="0.00"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                  />
                  <span className="text-[15px] text-[var(--ink-3)]">ETH</span>
                </div>
                {goalAmount && Number(goalAmount) > 0 && ethPrice > 0 && (
                  <span className="text-[13px] text-[var(--ink-2)]">≈ {goalUsd}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ipfs" className="field-label">
                  IPFS document hash <span className="font-normal text-[var(--ink-3)]">optional</span>
                </label>
                <input
                  id="ipfs"
                  type="text"
                  disabled={busy}
                  placeholder="Qm…"
                  value={ipfsHash}
                  onChange={(e) => setIpfsHash(e.target.value)}
                  className="field mono text-sm"
                />
              </div>
            </div>

            {errorMsg && <Notice tone="error">{errorMsg}</Notice>}

            {(isPending || isConfirming) && (
              <Notice tone="pending" title={isPending ? 'Confirm the transaction in your wallet…' : 'Waiting for the block…'}>
                {hash && <span className="mono">Tx {shortAddr(hash, 10, 8)}</span>}
              </Notice>
            )}

            {isSuccess && hash && (
              <Notice tone="success" title="Campaign is live on-chain">
                Taking you to campaigns ·{' '}
                <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="link mono font-normal">
                  {shortAddr(hash, 10, 8)}
                </a>
              </Notice>
            )}

            <div className="flex flex-wrap gap-3 items-center justify-between pt-[22px] border-t border-[var(--rule-soft)]">
              <span className="text-[13px] text-[var(--ink-2)]">
                Calls <code className="mono text-xs bg-[var(--surface-2)] px-1.5 py-[3px] rounded">createCampaign()</code> · gas paid in Sepolia ETH
              </span>
              <button type="submit" disabled={busy} className="btn btn-primary btn-xl">
                {isPending || isConfirming ? (
                  <>
                    <Spinner />
                    Deploying…
                  </>
                ) : isSuccess ? (
                  'Deployed'
                ) : (
                  'Deploy campaign'
                )}
              </button>
            </div>
          </form>

          <aside className="flex-[1_1_400px] min-w-0 flex flex-col gap-4">
            <span className="text-[13px] font-semibold text-[var(--ink-2)]">How donors will see it</span>
            <div className="card p-[22px] flex flex-col gap-4">
              <div className="flex justify-between items-center gap-2">
                <span className="mono text-xs text-[var(--ink-3)]">New · {shortAddr(address)}</span>
                {precheck ? (
                  <VerificationBadge badge={precheck.badge} score={precheck.score} />
                ) : (
                  <span className="skeleton h-[22px] w-24 rounded-full" />
                )}
              </div>
              <span className="text-lg font-semibold tracking-[-0.02em] leading-snug min-h-12 break-words">
                {title.trim() || 'Your campaign title'}
              </span>
              <div className="flex flex-col gap-2">
                <Progress percent={0} />
                <span className="text-sm">
                  <strong className="font-semibold">0.0000 ETH</strong>{' '}
                  <span className="text-[var(--ink-3)]">of {goalAmount.trim() || '0.00'} ETH</span>
                </span>
              </div>
            </div>

            <div className="card p-[22px] flex flex-col gap-3">
              {precheck ? (
                <>
                  <h2 className="m-0 text-base font-semibold">{PRECHECK_COPY[precheck.badge] || PRECHECK_COPY.UNVERIFIED}</h2>
                  <p className="m-0 text-sm leading-relaxed text-[var(--ink-2)]">
                    Risk {precheck.score} of 100. The badge follows your wallet history, so it can move after launch.
                    {precheck.badge === 'FLAGGED' && ' Flagged campaigns cannot take donations.'}
                  </p>
                </>
              ) : (
                <>
                  <span className="skeleton h-5 w-2/3" />
                  <span className="skeleton h-10 w-full" />
                </>
              )}
              <Link to={`/check?address=${address}`} className="link text-sm py-2">See your signals →</Link>
            </div>

            <ol className="m-0 py-[22px] pr-[22px] pl-11 bg-[var(--chip)] rounded-[14px] flex flex-col gap-3 text-sm leading-normal text-[var(--ink-body)]">
              <li>Donations land in the contract's escrow, never your wallet directly.</li>
              <li>
                Withdraw any amount up to the vault balance with <span className="mono text-[13px]">disburseFunds</span>.
              </li>
              <li>Every deposit and withdrawal is public on the audit page.</li>
              <li>You can close the campaign at any time. It can't be reopened.</li>
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
