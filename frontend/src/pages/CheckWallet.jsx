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
        badgeBg: 'bg-[var(--apple-green-tint)] border-[var(--apple-green-border)] text-[var(--apple-green)]',
        scoreText: 'text-[var(--apple-green)]',
        ringColor: 'stroke-[var(--apple-green)]',
        alertBg: 'bg-[var(--apple-green-tint)] border-[var(--apple-green-border)] text-[var(--apple-green)]',
        recommendation: 'This wallet appears safe to proceed with your donation.',
      };
    } else if (score <= 50) {
      return {
        level: 'MEDIUM',
        badgeBg: 'bg-[var(--apple-amber-tint)] border-[var(--apple-amber-border)] text-[var(--apple-amber)]',
        scoreText: 'text-[var(--apple-amber)]',
        ringColor: 'stroke-[var(--apple-amber)]',
        alertBg: 'bg-[var(--apple-amber-tint)] border-[var(--apple-amber-border)] text-[var(--apple-amber)]',
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
        badgeBg: 'bg-[var(--apple-red-tint)] border-[var(--apple-red-border)] text-[var(--apple-red)]',
        scoreText: 'text-[var(--apple-red)]',
        ringColor: 'stroke-[var(--apple-red)]',
        alertBg: 'bg-[var(--apple-red-tint)] border-[var(--apple-red-border)] text-[var(--apple-red)]',
        recommendation: 'DO NOT TRANSFER. This wallet shows multiple high-risk signals.',
      };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 animate-apple-fade-in">
      
      {/* ── Apple Header ── */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--apple-blue-tint)] border border-[var(--apple-blue-border)] text-[var(--apple-blue)] text-[11px] font-semibold uppercase tracking-wider">
          <span>TrustChain Risk Engine</span>
        </div>
        <h1 className="section-title text-[var(--text-primary)]">
          On-Chain Wallet Risk Assessment
        </h1>
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed font-normal">
          Evaluates Ethereum creator wallets for drain ratio anomalies, wallet age, transaction velocity, and CryptoScamDB flags before donating.
        </p>
      </div>

      {/* ── Spotlight-Style Input Form Card ── */}
      <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl">
        <form onSubmit={handleCheck} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Paste Ethereum wallet address (0x...)"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full apple-inset rounded-2xl pl-4 pr-28 py-3 text-xs text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--apple-blue-border)] transition-colors font-medium"
              />
              {connectedAddress && (
                <button
                  type="button"
                  onClick={handleUseConnectedWallet}
                  className="absolute right-2.5 top-2 text-[11px] px-3 py-1.5 rounded-full apple-glass text-[var(--apple-blue)] font-semibold hover:border-[var(--apple-blue-border)] transition-colors cursor-pointer apple-press"
                >
                  Use My Wallet
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer apple-press"
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
                  <span>Analyze Wallet</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-[var(--apple-red)] bg-[var(--apple-red-tint)] p-3.5 rounded-2xl border border-[var(--apple-red-border)] font-medium">
              ⚠️ {errorMsg}
            </p>
          )}
        </form>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="apple-glass p-8 rounded-3xl animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-[var(--border-color)] rounded-full w-1/3"></div>
            <div className="h-10 bg-[var(--border-color)] rounded-full w-1/4"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-[var(--border-color)] rounded-2xl"></div>
            ))}
          </div>
          <div className="h-40 bg-[var(--border-color)] rounded-2xl"></div>
        </div>
      )}

      {/* ── Report Section ── */}
      {report && !loading && (
        <div className="space-y-8 animate-apple-fade-in">
          {/* Main Risk Overview */}
          {(() => {
            const theme = getThemeByScore(report.score);
            return (
              <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${theme.badgeBg}`}>
                        RISK LEVEL: {theme.level}
                      </span>
                      {report.isBlacklisted && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--apple-red-tint)] border border-[var(--apple-red-border)] text-[var(--apple-red)]">
                          🚨 BLACKLISTED
                        </span>
                      )}
                    </div>
                    <h2 className="headline text-[var(--text-primary)]">Risk Assessment Result</h2>
                    <p className="text-xs text-[var(--text-muted)] font-mono break-all">{inputAddress.trim()}</p>
                  </div>

                  {/* Circular Score Display (Apple Activity Ring Inspired) */}
                  <div className="flex items-center gap-4 apple-inset p-4 rounded-3xl">
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
                      <span className="caption-label text-[var(--text-muted)]">Risk Score</span>
                      <p className={`text-base font-bold ${theme.scoreText}`}>{report.score} / 100</p>
                    </div>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${theme.alertBg}`}>
                  <span className="text-xl">💡</span>
                  <div className="space-y-0.5">
                    <span className="caption-label opacity-80">Recommendation</span>
                    <p className="text-xs sm:text-sm font-semibold">{theme.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Risk Signal Breakdown Cards ── */}
          <div className="space-y-4">
            <h3 className="headline text-[var(--text-primary)]">Risk Signal Breakdown</h3>
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

          {/* ── Detailed Risk Factors (Apple Settings Grouped) ── */}
          <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-4">
            <h3 className="headline text-[var(--text-primary)]">Risk Factor Evaluation</h3>
            <div className="space-y-3">
              {report.signals.map((sig, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-2xl apple-inset"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{sig.isWarning ? '⚠️' : '✓'}</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{sig.name}</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-normal">{sig.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      sig.isWarning
                        ? 'bg-[var(--apple-red-tint)] text-[var(--apple-red)] border border-[var(--apple-red-border)]'
                        : 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)]'
                    }`}
                  >
                    {sig.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recent Transactions Table ── */}
          <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="headline text-[var(--text-primary)]">Recent On-Chain Transactions (Last 10)</h3>
              <span className="text-xs text-[var(--text-muted)] font-medium">{report.transactions.length} Transactions</span>
            </div>

            {report.transactions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6 font-normal">No recent transactions found for this wallet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Tx Hash</th>
                      <th className="py-3 px-3">From</th>
                      <th className="py-3 px-3">To</th>
                      <th className="py-3 px-3">Value (ETH)</th>
                      <th className="py-3 px-3">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
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
                        <tr key={i} className="hover:bg-[var(--bg-inset)] font-mono transition-colors">
                          <td className="py-3.5 px-3 text-[var(--apple-blue)] font-medium hover:underline">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                            </a>
                          </td>
                          <td className="py-3.5 px-3 text-[var(--text-secondary)]">
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </td>
                          <td className="py-3.5 px-3 text-[var(--text-secondary)]">
                            {tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'Contract Creation'}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-[var(--text-primary)]">{parseFloat(valueEth).toFixed(4)} ETH</td>
                          <td className="py-3.5 px-3 text-[var(--text-muted)] font-sans font-normal">{ageDays > 0 ? `${ageDays}d ago` : 'Today'}</td>
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
                className="px-8 py-3.5 rounded-full bg-[var(--apple-green)] hover:bg-[var(--apple-green-hover)] text-white font-semibold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer apple-press"
              >
                <span>Proceed to Verified Campaigns</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14m-7-7 7 7-7 7" />
                </svg>
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
      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
        isWarning
          ? 'bg-[var(--apple-red-tint)] border-[var(--apple-red-border)]'
          : 'apple-inset'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {isWarning && <span className="w-2 h-2 rounded-full bg-[var(--apple-red)]"></span>}
      </div>
      <div>
        <span className="caption-label text-[var(--text-muted)]">{label}</span>
        <p className={`text-base font-bold mt-0.5 ${isWarning ? 'text-[var(--apple-red)]' : 'text-[var(--text-primary)]'}`}>
          {value}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1 font-normal">{subtext}</p>
      </div>
    </div>
  );
}
