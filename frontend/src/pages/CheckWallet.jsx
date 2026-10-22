import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { analyseWallet } from '../services/riskEngine';
import VerificationBadge from '../components/VerificationBadge';
import { AlertIcon, CheckIcon, Notice, RiskScale, Spinner } from '../components/ui';
import { BAND, bandForScore, signalPoints } from '../lib/risk';
import { shortAddr } from '../lib/format';

const ADVICE = {
  VERIFIED: {
    head: 'Safe to proceed',
    text: 'Long enough history, keeps what it receives, and no blacklist record.',
    cls: 'bg-[var(--accent-tint)] text-[var(--accent)]',
  },
  CAUTION: {
    head: 'Proceed with care',
    text: 'Some signals are weak. Confirm who runs this wallet before you give.',
    cls: 'bg-[var(--amber-tint)] text-[var(--amber)]',
  },
  UNVERIFIED: {
    head: 'Treat as unknown',
    text: 'Several risk signals fired. We advise against sending funds to this wallet.',
    cls: 'bg-[var(--neutral-tint)] text-[var(--ink)]',
  },
  FLAGGED: {
    head: 'Do not send funds',
    text: 'This wallet is blacklisted or moves almost everything it receives straight out.',
    cls: 'bg-[var(--red-tint)] text-[var(--red)]',
  },
};

const isAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim());

export default function CheckWallet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { address: connectedAddress } = useAccount();

  const [inputAddress, setInputAddress] = useState(searchParams.get('address') || '');
  const [checkedAddress, setCheckedAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const runCheck = useCallback(async (raw) => {
    setErrorMsg('');
    const target = raw.trim();

    if (!target) {
      setErrorMsg('Paste an Ethereum address to check.');
      return;
    }
    if (!isAddress(target)) {
      setErrorMsg('That isn’t a valid address. It should be 42 characters starting with 0x.');
      return;
    }

    setLoading(true);
    setReport(null);
    try {
      const res = await analyseWallet(target, import.meta.env.VITE_ETHERSCAN_API_KEY);
      setReport(res);
      setCheckedAddress(target);
    } catch (err) {
      console.error('Wallet analysis failed:', err);
      setErrorMsg('The check could not reach Etherscan. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep links like /check?address=0x… run straight away
  const paramAddress = searchParams.get('address');
  useEffect(() => {
    if (paramAddress && isAddress(paramAddress)) {
      setInputAddress(paramAddress);
      runCheck(paramAddress);
    }
  }, [paramAddress, runCheck]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const target = inputAddress.trim();
    // A new valid address goes through the URL so the result is linkable; the effect runs it
    if (isAddress(target) && target !== paramAddress) {
      setSearchParams({ address: target }, { replace: true });
      return;
    }
    runCheck(target);
  };

  const band = report ? bandForScore(report.score) : null;
  const effectiveBand = report?.isBlacklisted ? 'FLAGGED' : band;
  const warnings = report ? report.signals.filter((s) => s.isWarning).length : 0;
  const advice = effectiveBand
    ? effectiveBand === 'VERIFIED' && warnings > 0
      ? {
          ...ADVICE.VERIFIED,
          text: `Passes overall, but ${warnings === 1 ? 'one signal' : `${warnings} signals`} added points. Read ${warnings === 1 ? 'it' : 'them'} before you give.`,
        }
      : ADVICE[effectiveBand]
    : null;

  return (
    <div className="page pt-14 pb-24 flex flex-col gap-8">
      <div className="flex flex-col gap-2.5 max-w-[46rem]">
        <h1 className="h1">Check any wallet</h1>
        <p className="lead">
          Paste a Sepolia address. We read its history from Etherscan, look it up on CryptoScamDB, and score it the same way we score every campaign creator.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2.5">
          <label className="field-group flex-[1_1_420px] min-h-14">
            <span className="sr-only">Wallet address</span>
            <input
              type="text"
              placeholder="0x…"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="mono text-[15px]"
              spellCheck={false}
              autoComplete="off"
            />
            {connectedAddress && (
              <button
                type="button"
                onClick={() => {
                  setInputAddress(connectedAddress);
                  setErrorMsg('');
                }}
                className="link bg-transparent border-0 cursor-pointer text-[13px] font-[inherit] min-h-11 whitespace-nowrap"
              >
                Use my wallet
              </button>
            )}
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary btn-xl min-h-14">
            {loading ? (
              <>
                <Spinner />
                Analysing…
              </>
            ) : (
              'Analyse'
            )}
          </button>
        </div>
        {errorMsg && <Notice tone="error">{errorMsg}</Notice>}
      </form>

      {loading && (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }} aria-busy="true">
          <span className="skeleton h-[420px]" />
          <span className="skeleton h-[420px]" />
        </div>
      )}

      {report && !loading && (
        <>
          <section aria-label="Result" className="grid gap-5 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
            <div className="card p-7 flex flex-col gap-[22px]">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-[var(--ink-2)]">Risk score</span>
                <div className="flex gap-2 flex-wrap">
                  {report.isBlacklisted && <span className="badge tone-flagged text-[13px] px-3 py-[5px]">On CryptoScamDB</span>}
                  <VerificationBadge badge={effectiveBand} size="lg" />
                </div>
              </div>
              <p className="mono text-xs text-[var(--ink-3)] break-all m-0">{checkedAddress}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[88px] font-bold tracking-[-0.05em] leading-[0.9]" style={{ color: BAND[band].color }}>
                  {report.score}
                </span>
                <span className="text-lg text-[var(--ink-3)]">/ 100</span>
              </div>
              <RiskScale score={report.score} labels="names" />
              <div className={`p-4 rounded-[10px] ${advice.cls}`}>
                <span className="text-[15px] font-semibold">{advice.head}</span>
                <p className="m-0 mt-1.5 text-sm leading-relaxed text-[var(--ink-body)]">{advice.text}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Fact k="Wallet age" v={`${report.walletAge} days`} />
                <Fact k="Transactions" v={report.txCount} />
                <Fact k="Balance" v={`${report.balance} ETH`} />
                <Fact k="Outflow ratio" v={`${report.drainRatio}%`} />
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--rule-soft)] flex justify-between items-baseline gap-3">
                <h2 className="m-0 text-lg font-semibold tracking-[-0.02em]">How the score adds up</h2>
                <span className="text-[13px] text-[var(--ink-3)]">points added</span>
              </div>
              {report.signals.map((s) => {
                const pts = signalPoints(s);
                return (
                  <div key={s.name} className="grid gap-3.5 items-start px-6 py-4 border-b border-[var(--rule-soft)]" style={{ gridTemplateColumns: '20px minmax(0, 1fr) 52px' }}>
                    {s.isWarning ? (
                      <AlertIcon size={18} className="text-[var(--red)] mt-0.5" />
                    ) : (
                      <CheckIcon size={18} className="text-[var(--accent)] mt-0.5" />
                    )}
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-[15px] font-semibold">{s.name}</span>
                      <span className="text-sm leading-normal text-[var(--ink-2)]">{s.description}</span>
                    </div>
                    <span className={`mono text-sm text-right font-medium ${pts > 0 ? 'text-[var(--red)]' : 'text-[var(--ink-3)]'}`}>
                      {pts > 0 ? `+${pts}` : '0'}
                    </span>
                  </div>
                );
              })}
              <div className="grid gap-3.5 px-6 py-4 bg-[var(--surface-2)]" style={{ gridTemplateColumns: 'minmax(0, 1fr) 52px' }}>
                <span className="text-[15px] font-semibold">Total{report.score === 100 ? ' (capped at 100)' : ''}</span>
                <span className="mono text-[15px] text-right font-semibold">{report.score}</span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3.5">
            <h2 className="h3">Last {Math.min(10, report.transactions.length) || 10} transactions</h2>
            <div className="card overflow-x-auto">
              {report.transactions.length === 0 ? (
                <p className="m-0 p-8 text-center text-sm text-[var(--ink-3)]">No transactions found for this wallet.</p>
              ) : (
                <table className="ledger min-w-[620px]">
                  <thead>
                    <tr>
                      <th scope="col">Tx hash</th>
                      <th scope="col">Direction</th>
                      <th scope="col">Counterparty</th>
                      <th scope="col" className="num">Value</th>
                      <th scope="col" className="num">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((tx) => {
                      let valueEth;
                      try {
                        valueEth = Number(formatEther(BigInt(tx.value || '0')));
                      } catch {
                        valueEth = Number(tx.value || 0) / 1e18;
                      }
                      const outgoing = tx.from?.toLowerCase() === checkedAddress.toLowerCase();
                      const counterparty = outgoing ? tx.to : tx.from;
                      const ageDays = Math.floor((Date.now() / 1000 - Number(tx.timeStamp || Date.now() / 1000)) / 86400);
                      return (
                        <tr key={tx.hash}>
                          <td>
                            <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="link mono text-[13px] font-normal">
                              {shortAddr(tx.hash, 6, 4)} ↗
                            </a>
                          </td>
                          <td className="text-[var(--ink-2)]">{outgoing ? 'Out' : 'In'}</td>
                          <td className="mono text-[13px] text-[var(--ink-2)] whitespace-nowrap">{counterparty ? shortAddr(counterparty) : 'Contract creation'}</td>
                          <td className="num font-semibold">{valueEth.toFixed(4)} ETH</td>
                          <td className="num text-[var(--ink-3)]">{ageDays > 0 ? `${ageDays} d` : 'Today'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {effectiveBand !== 'FLAGGED' && report.score < 51 && (
            <div className="flex justify-center pt-2">
              <Link to="/campaigns?filter=VERIFIED" className="btn btn-secondary btn-lg">Browse verified campaigns →</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Fact({ k, v }) {
  return (
    <div className="well px-3.5 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-[var(--ink-3)]">{k}</span>
      <span className="text-[17px] font-semibold">{v}</span>
    </div>
  );
}
