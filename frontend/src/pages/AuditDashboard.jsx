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
      <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            🔍 On-Chain Audit & Verification
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">Audit Dashboard</h1>
          <p className="text-slate-400 mt-1 font-mono text-xs break-all">
            Target Address: <span className="text-indigo-400">{targetAddress || 'N/A'}</span>
          </p>
        </div>

        <Link
          to={`/check`}
          className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors self-start sm:self-auto"
        >
          Check Wallet Risk →
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-slate-800 rounded-2xl"></div>
            <div className="h-28 bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="h-64 bg-slate-800 rounded-2xl"></div>
        </div>
      ) : (
        <>
          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-medium">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-lg">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Donations Received</span>
              <p className="text-3xl font-black text-emerald-400">{totalDonations.toFixed(4)} ETH</p>
              <p className="text-xs text-slate-400">Total incoming ETH on Sepolia testnet</p>
            </div>

            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-2 shadow-lg">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Funds Disbursed</span>
              <p className="text-3xl font-black text-indigo-400">{totalDisbursements.toFixed(4)} ETH</p>
              <p className="text-xs text-slate-400">Total outgoing ETH transfers recorded on-chain</p>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-lg font-bold text-white">Donations & Disbursements Timeline</h3>
            {chartData.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No donation or disbursement timeline data available.</p>
            ) : (
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                    />
                    <Bar dataKey="Donations" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Disbursements" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Transaction History Table */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Transaction History</h3>
              <span className="text-xs text-slate-400 font-mono">{transactions.length} Transactions</span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No ETH donation or disbursement transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Amount (ETH)</th>
                      <th className="py-3 px-3">TxHash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 font-mono transition-colors">
                        <td className="py-3 px-3 text-slate-300 font-sans">{tx.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'Donation'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{tx.value.toFixed(4)} ETH</td>
                        <td className="py-3 px-3 text-indigo-400 hover:underline">
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
