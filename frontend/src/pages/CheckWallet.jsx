import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { analyseWallet } from '../services/riskEngine';

export default function CheckWallet() {
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();

  const [inputAddress, setInputAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const validateAddress = (addr) => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
  };

  const handleCheck = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    const target = inputAddress.trim();

    if (!target) {
      setErrorMsg('Please enter an Ethereum wallet address.');
      return;
    }

    if (!validateAddress(target)) {
      setErrorMsg('Invalid Ethereum address format. Expected 42-character hex string starting with 0x.');
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
      const res = await analyseWallet(target, apiKey);
      setReport(res);
    } catch (err) {
      console.error('Wallet analysis failed:', err);
      setErrorMsg('Failed to fetch wallet analysis. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseConnectedWallet = () => {
    if (connectedAddress) {
      setInputAddress(connectedAddress);
      setErrorMsg('');
    }
  };

  // Helper styling for score & risk level
  const getThemeByScore = (score) => {
    if (score <= 25) {
      return {
        level: 'LOW',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        scoreText: 'text-emerald-600 dark:text-emerald-400',
        ringColor: 'stroke-emerald-500',
        alertBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200',
        recommendation: 'This wallet appears safe to proceed with your donation.',
      };
    } else if (score <= 50) {
      return {
        level: 'MEDIUM',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
        scoreText: 'text-amber-600 dark:text-amber-400',
        ringColor: 'stroke-amber-500',
        alertBg: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200',
        recommendation: 'Proceed with caution. Verify this wallet through other means.',
      };
    } else if (score <= 75) {
      return {
        level: 'HIGH',
        badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
        scoreText: 'text-orange-600 dark:text-orange-400',
        ringColor: 'stroke-orange-500',
        alertBg: 'bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-200',
        recommendation: 'We strongly advise against transferring funds to this wallet.',
      };
    } else {
      return {
        level: 'CRITICAL',
        badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
        scoreText: 'text-rose-600 dark:text-rose-400',
        ringColor: 'stroke-rose-500',
        alertBg: 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200',
        recommendation: 'DO NOT TRANSFER. This wallet shows multiple high-risk signals.',
      };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase tracking-wider">
          🔍 TrustChain Risk Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Wallet Risk Assessment
        </h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed font-medium">
          Inspect any Ethereum wallet address for transaction anomalies, fund drain ratios, wallet age, and CryptoScamDB flags before donating.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="theme-card p-6 sm:p-8 rounded-2xl shadow-xl space-y-4">
        <form onSubmit={handleCheck} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Paste Ethereum wallet address (0x...)"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full theme-inset rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
              />
              {connectedAddress && (
                <button
                  type="button"
                  onClick={handleUseConnectedWallet}
                  className="absolute right-3 top-2.5 text-xs px-2.5 py-1.5 rounded-lg theme-card text-indigo-600 dark:text-indigo-300 font-bold hover:border-indigo-500/50 transition-colors cursor-pointer"
                >
                  Use My Wallet
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Check Wallet</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-bold">
              ⚠️ {errorMsg}
            </p>
          )}
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="theme-card p-8 rounded-2xl animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-[var(--border-color)] rounded w-1/3"></div>
            <div className="h-10 bg-[var(--border-color)] rounded w-1/4"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-[var(--border-color)] rounded-xl"></div>
            ))}
          </div>
          <div className="h-40 bg-[var(--border-color)] rounded-xl"></div>
        </div>
      )}

      {/* Report Section */}
      {report && !loading && (
        <div className="space-y-8 animate-fade-in">
          {/* Main Risk Overview */}
          {(() => {
            const theme = getThemeByScore(report.score);
            return (
              <div className="theme-card p-8 rounded-2xl space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${theme.badgeBg}`}>
                        RISK LEVEL: {theme.level}
                      </span>
                      {report.isBlacklisted && (
                        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400">
                          🚨 BLACKLISTED
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Risk Assessment Result</h2>
                    <p className="text-xs text-[var(--text-muted)] font-mono break-all">{inputAddress.trim()}</p>
                  </div>

                  {/* Circular Score Display */}
                  <div className="flex items-center gap-4 theme-inset p-4 rounded-2xl">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[var(--border-color)] stroke-current"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={`${theme.ringColor} stroke-current transition-all duration-1000`}
                          strokeDasharray={`${report.score}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className={`absolute text-2xl font-extrabold ${theme.scoreText}`}>
                        {report.score}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Risk Score</span>
                      <p className={`text-lg font-extrabold ${theme.scoreText}`}>{report.score} / 100</p>
                    </div>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${theme.alertBg}`}>
                  <span className="text-xl">💡</span>
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider opacity-80">Recommendation</span>
                    <p className="text-sm font-bold">{theme.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Risk Signal Breakdown Cards */}
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Risk Signal Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <SignalCard
                icon="📅"
                label="Wallet Age"
                value={`${report.walletAge} Days`}
                subtext={report.isNewWallet ? 'New Wallet (< 30 days)' : 'Established'}
                isWarning={report.isNewWallet}
              />
              <SignalCard
                icon="🔢"
                label="Transaction Count"
                value={`${report.txCount}`}
                subtext={report.hasLowActivity ? 'Low Activity (< 5 txs)' : 'Active History'}
                isWarning={report.hasLowActivity}
              />
              <SignalCard
                icon="💸"
                label="Drain Ratio"
                value={`${report.drainRatio}%`}
                subtext={Number(report.drainRatio) > 90 ? 'Rapid Outflow (> 90%)' : 'Normal Flow'}
                isWarning={Number(report.drainRatio) > 90}
              />
              <SignalCard
                icon="🛑"
                label="Blacklist Status"
                value={report.isBlacklisted ? 'FLAGGED' : 'CLEAR'}
                subtext={report.isBlacklisted ? report.blacklistDetails.category : 'No Scam Records'}
                isWarning={report.isBlacklisted}
              />
              <SignalCard
                icon="💎"
                label="Balance"
                value={`${report.balance} ETH`}
                subtext="Sepolia ETH"
                isWarning={false}
              />
            </div>
          </div>

          {/* Detailed Risk Factors */}
          <div className="theme-card p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Risk Factor Evaluation</h3>
            <div className="space-y-3">
              {report.signals.map((sig, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl theme-inset"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{sig.isWarning ? '⚠️' : '✅'}</span>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{sig.name}</h4>
                      <p className="text-xs text-[var(--text-muted)] font-medium">{sig.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                      sig.isWarning
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {sig.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="theme-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Recent On-Chain Transactions (Last 10)</h3>
              <span className="text-xs text-[var(--text-muted)] font-bold">{report.transactions.length} Transactions</span>
            </div>

            {report.transactions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">No recent transactions found for this wallet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-3">Tx Hash</th>
                      <th className="py-3 px-3">From</th>
                      <th className="py-3 px-3">To</th>
                      <th className="py-3 px-3">Value (ETH)</th>
                      <th className="py-3 px-3">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {report.transactions.map((tx, i) => {
                      const valueEth = (() => {
                        try {
                          return formatEther(BigInt(tx.value || '0'));
                        } catch {
                          return (Number(tx.value || 0) / 1e18).toFixed(4);
                        }
                      })();

                      const ageDays = Math.floor(
                        (Date.now() / 1000 - Number(tx.timeStamp || Date.now() / 1000)) / 86400
                      );

                      return (
                        <tr key={i} className="hover:bg-[var(--border-subtle)]/30 font-mono transition-colors">
                          <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                            </a>
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'Contract Creation'}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-[var(--text-primary)]">{parseFloat(valueEth).toFixed(4)} ETH</td>
                          <td className="py-3 px-3 text-[var(--text-muted)] font-sans font-medium">{ageDays > 0 ? `${ageDays}d ago` : 'Today'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Conditional Action Button */}
          {report.score < 50 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => navigate('/campaigns')}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Donate</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignalCard({ icon, label, value, subtext, isWarning }) {
  return (
    <div
      className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
        isWarning
          ? 'bg-rose-500/10 border-rose-500/30'
          : 'theme-inset'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {isWarning && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
      </div>
      <div>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">{label}</span>
        <p className={`text-base font-extrabold mt-0.5 ${isWarning ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'}`}>
          {value}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1 font-medium">{subtext}</p>
      </div>
    </div>
  );
}
