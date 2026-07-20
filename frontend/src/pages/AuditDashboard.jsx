import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { formatEther } from 'viem';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AuditDashboard() {
  const { address } = useParams();
  const targetAddress = address ? address.toLowerCase().trim() : '';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalDisbursements, setTotalDisbursements] = useState(0);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function fetchAuditData() {
      if (!targetAddress) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg('');

      try {
        const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
        const res = await axios.get('https://api.etherscan.io/v2/api', {
          params: {
            chainid: 11155111,
            module: 'account',
            action: 'txlist',
            address: targetAddress,
            startblock: 0,
            endblock: 99999999,
            sort: 'asc',
            apikey: apiKey,
          },
          timeout: 8000,
        });

        let rawTxs = [];
        if (res.data && Array.isArray(res.data.result)) {
          rawTxs = res.data.result;
        }

        let donationsSum = 0;
        let disbursementsSum = 0;
        const processedTxs = [];
        const monthlyTimeline = {};

        rawTxs.forEach((tx) => {
          let valEth = 0;
          try {
            valEth = Number(formatEther(BigInt(tx.value || '0')));
          } catch {
            valEth = Number(tx.value || 0) / 1e18;
          }

          const isIncoming = tx.to && tx.to.toLowerCase() === targetAddress;
          const isOutgoing = tx.from && tx.from.toLowerCase() === targetAddress;

          let type = 'Other';
          if (isIncoming && valEth > 0) {
            type = 'Donation';
            donationsSum += valEth;
          } else if (isOutgoing && valEth > 0) {
            type = 'Disbursement';
            disbursementsSum += valEth;
          }

          const txDate = tx.timeStamp
            ? new Date(Number(tx.timeStamp) * 1000).toLocaleDateString()
            : 'N/A';

          if (valEth > 0) {
            processedTxs.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: valEth,
              type,
              date: txDate,
              timestamp: Number(tx.timeStamp || 0),
            });

            // Group into chart data by date
            if (!monthlyTimeline[txDate]) {
              monthlyTimeline[txDate] = { date: txDate, Donations: 0, Disbursements: 0 };
            }
            if (type === 'Donation') {
              monthlyTimeline[txDate].Donations += valEth;
            } else if (type === 'Disbursement') {
              monthlyTimeline[txDate].Disbursements += valEth;
            }
          }
        });

        setTransactions(processedTxs.reverse()); // latest first
        setTotalDonations(donationsSum);
        setTotalDisbursements(disbursementsSum);

        const timelineArray = Object.values(monthlyTimeline).map((item) => ({
          ...item,
          Donations: Number(item.Donations.toFixed(4)),
          Disbursements: Number(item.Disbursements.toFixed(4)),
        }));

        setChartData(timelineArray);
      } catch (err) {
        console.error('Audit dashboard fetch error:', err);
        setErrorMsg('Failed to fetch transaction audit data from Etherscan.');
      } finally {
        setLoading(false);
      }
    }

    fetchAuditData();
  }, [targetAddress]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
            🔍 On-Chain Audit & Verification
          </span>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mt-2">Audit Dashboard</h1>
          <p className="text-[var(--text-muted)] mt-1 font-mono text-xs break-all font-semibold">
            Target Address: <span className="text-indigo-600 dark:text-indigo-400">{targetAddress || 'N/A'}</span>
          </p>
        </div>

        <Link
          to={`/check`}
          className="text-xs px-3.5 py-2.5 rounded-xl theme-card font-extrabold text-[var(--text-primary)] hover:border-indigo-500/50 transition-colors self-start sm:self-auto cursor-pointer"
        >
          Check Wallet Risk →
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-[var(--border-color)] rounded-2xl"></div>
            <div className="h-28 bg-[var(--border-color)] rounded-2xl"></div>
          </div>
          <div className="h-64 bg-[var(--border-color)] rounded-2xl"></div>
        </div>
      ) : (
        <>
          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-bold">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="theme-card p-6 rounded-2xl space-y-2 shadow-lg">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Total Donations Received</span>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalDonations.toFixed(4)} ETH</p>
              <p className="text-xs text-[var(--text-muted)] font-medium">Total incoming ETH on Sepolia testnet</p>
            </div>

            <div className="theme-card p-6 rounded-2xl space-y-2 shadow-lg">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Total Funds Disbursed</span>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalDisbursements.toFixed(4)} ETH</p>
              <p className="text-xs text-[var(--text-muted)] font-medium">Total outgoing ETH transfers recorded on-chain</p>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="theme-card p-6 rounded-2xl space-y-4 shadow-lg">
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Donations & Disbursements Timeline</h3>
            {chartData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-8 text-center font-medium">No donation or disbursement timeline data available.</p>
            ) : (
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="Donations" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Disbursements" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Transaction History Table */}
          <div className="theme-card p-6 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Transaction History</h3>
              <span className="text-xs text-[var(--text-muted)] font-mono font-bold">{transactions.length} Transactions</span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-8 text-center font-medium">No ETH donation or disbursement transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Amount (ETH)</th>
                      <th className="py-3 px-3">TxHash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {transactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-[var(--border-subtle)]/30 font-mono transition-colors">
                        <td className="py-3 px-3 text-[var(--text-secondary)] font-sans font-medium">{tx.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'Donation'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[var(--text-primary)]">{tx.value.toFixed(4)} ETH</td>
                        <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
