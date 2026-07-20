import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { formatEther } from 'viem';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export default function AuditDashboard() {
  const { identifier, campaignId: routeCampaignId } = useParams();

  // Determine if auditing a specific campaign ID or a full wallet address
  const activeId = routeCampaignId || identifier || '';
  const isCampaignAudit = !isNaN(Number(activeId)) && Number(activeId) > 0;
  const targetCampaignId = isCampaignAudit ? BigInt(activeId) : null;
  const targetAddress = !isCampaignAudit && activeId ? activeId.toLowerCase().trim() : '';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalDisbursements, setTotalDisbursements] = useState(0);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function fetchAuditData() {
      if (!activeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg('');

      try {
        const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
        });

        let campaignOwner = '';
        const ownedCampaignIds = new Set();

        // 1. If Campaign-Specific Audit, fetch campaign details on-chain
        if (isCampaignAudit) {
          try {
            const camp = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getCampaign',
              args: [targetCampaignId],
            });
            if (camp) {
              setCampaignDetails({
                id: Number(targetCampaignId),
                title: camp.title,
                owner: camp.owner,
                goal: formatEther(camp.goalAmount || 0n),
                raised: formatEther(camp.raisedAmount || 0n),
                disbursed: formatEther(camp.disbursedAmount || 0n),
                isActive: camp.isActive,
              });
              campaignOwner = camp.owner.toLowerCase();
              ownedCampaignIds.add(targetCampaignId);
            }
          } catch (err) {
            console.error('Failed to read campaign details:', err);
          }
        } else if (targetAddress) {
          // Wallet Audit: identify all campaign IDs owned by targetAddress
          try {
            const countData = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getCampaignCount',
            });
            const campaignCount = countData ? Number(countData) : 0;

            for (let i = 1; i <= campaignCount; i++) {
              const camp = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'getCampaign',
                args: [BigInt(i)],
              });
              if (camp?.owner && camp.owner.toLowerCase() === targetAddress) {
                ownedCampaignIds.add(BigInt(i));
              }
            }
          } catch (err) {
            console.error('Failed to query campaign ownership for wallet audit:', err);
          }
        }

        // 2. Fetch Etherscan txlist for CONTRACT_ADDRESS & user address
        const queryAddress = isCampaignAudit ? campaignOwner || CONTRACT_ADDRESS : targetAddress;

        const [userTxRes, contractTxRes] = await Promise.all([
          queryAddress
            ? axios.get('https://api.etherscan.io/v2/api', {
                params: {
                  chainid: 11155111,
                  module: 'account',
                  action: 'txlist',
                  address: queryAddress,
                  startblock: 0,
                  endblock: 99999999,
                  sort: 'desc',
                  apikey: apiKey,
                },
                timeout: 10000,
              }).catch(() => null)
            : Promise.resolve(null),
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
        ]);

        const rawUserTxs = userTxRes?.data?.result && Array.isArray(userTxRes.data.result) ? userTxRes.data.result : [];
        const rawContractTxs = contractTxRes?.data?.result && Array.isArray(contractTxRes.data.result) ? contractTxRes.data.result : [];

        // Combine and deduplicate
        const allTxMap = new Map();
        [...rawUserTxs, ...rawContractTxs].forEach((tx) => {
          if (tx.hash) {
            allTxMap.set(tx.hash.toLowerCase(), tx);
          }
        });
        const combinedTxs = Array.from(allTxMap.values());

        let donationsSum = 0;
        let disbursementsSum = 0;
        const processedTxs = [];
        const monthlyTimeline = {};

        combinedTxs.forEach((tx) => {
          if (tx.isError === '1') return; // Skip reverted txs

          const fromAddr = (tx.from || '').toLowerCase();
          const toAddr = (tx.to || '').toLowerCase();
          const fnName = (tx.functionName || '').toLowerCase();

          let valEth = 0;
          try {
            valEth = Number(formatEther(BigInt(tx.value || '0')));
          } catch {
            valEth = Number(tx.value || 0) / 1e18;
          }

          let type = null;
          let calculatedValEth = valEth;

          // Decode input calldata
          let calldataCampaignId = null;
          let calldataDisburseAmount = null;

          if (tx.input && tx.input.length >= 74) {
            try {
              calldataCampaignId = BigInt('0x' + tx.input.slice(10, 74));
            } catch {
              // Ignore
            }
          }
          if (tx.input && tx.input.length >= 138 && fnName.includes('disburse')) {
            try {
              calldataDisburseAmount = BigInt('0x' + tx.input.slice(74, 138));
            } catch {
              // Ignore
            }
          }

          // FILTER CONDITION:
          // If Campaign Audit: strict match on calldataCampaignId === targetCampaignId
          // If Wallet Audit: match ownedCampaignIds or direct to/from targetAddress
          const matchesCampaignScope = isCampaignAudit
            ? calldataCampaignId === targetCampaignId
            : ownedCampaignIds.has(calldataCampaignId) || fromAddr === targetAddress || toAddr === targetAddress;

          if (!matchesCampaignScope && (isCampaignAudit || targetAddress)) return;

          // Case A: Disburse Funds
          if (fnName.includes('disburse')) {
            type = 'Disbursement';
            if (calldataDisburseAmount && calldataDisburseAmount > 0n) {
              calculatedValEth = Number(formatEther(calldataDisburseAmount));
            }
            disbursementsSum += calculatedValEth;
          }
          // Case B: Donate
          else if (fnName.includes('donate')) {
            type = 'Donation';
            donationsSum += calculatedValEth;
          }
          // Case C: Direct ETH transfer to target
          else if (toAddr === targetAddress && valEth > 0) {
            type = 'Donation';
            donationsSum += calculatedValEth;
          }
          // Case D: Direct ETH transfer from target
          else if (fromAddr === targetAddress && valEth > 0 && toAddr !== CONTRACT_ADDRESS.toLowerCase()) {
            type = 'Disbursement';
            disbursementsSum += calculatedValEth;
          }

          if (type && calculatedValEth > 0) {
            const dateObj = tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000) : new Date();
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString();

            processedTxs.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: calculatedValEth,
              type,
              date: dateStr,
              time: timeStr,
              timestamp: Number(tx.timeStamp || 0),
            });

            // Group by date for chart
            if (!monthlyTimeline[dateStr]) {
              monthlyTimeline[dateStr] = {
                date: dateStr,
                timestamp: Number(tx.timeStamp || 0),
                Donations: 0,
                Disbursements: 0,
              };
            }
            if (type === 'Donation') {
              monthlyTimeline[dateStr].Donations += calculatedValEth;
            } else if (type === 'Disbursement') {
              monthlyTimeline[dateStr].Disbursements += calculatedValEth;
            }
          }
        });

        // Sort transactions latest first
        processedTxs.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(processedTxs);

        setTotalDonations(donationsSum);
        setTotalDisbursements(disbursementsSum);

        // Timeline array sorted chronologically
        const timelineArray = Object.values(monthlyTimeline)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((item) => ({
            date: item.date,
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
  }, [activeId, isCampaignAudit, targetCampaignId, targetAddress]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider animate-float inline-block">
            {isCampaignAudit ? '🔍 Campaign Audit & Verification' : '🔍 Wallet Audit & Verification'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mt-2">
            {isCampaignAudit && campaignDetails
              ? `Audit: Campaign #${campaignDetails.id} - ${campaignDetails.title}`
              : isCampaignAudit
              ? `Audit: Campaign #${activeId}`
              : 'Wallet Audit Dashboard'}
          </h1>
          <p className="text-[var(--text-muted)] mt-1 font-mono text-xs break-all font-semibold">
            {isCampaignAudit && campaignDetails ? (
              <span>
                Creator Address: <span className="text-indigo-600 dark:text-indigo-400">{campaignDetails.owner}</span> | Goal: {campaignDetails.goal} ETH
              </span>
            ) : (
              <span>
                Target Address: <span className="text-indigo-600 dark:text-indigo-400">{targetAddress || 'N/A'}</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCampaignAudit && campaignDetails?.owner && (
            <Link
              to={`/audit/${campaignDetails.owner}`}
              className="btn-vibe text-xs px-4 py-2.5 rounded-xl theme-card font-extrabold text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50 transition-all cursor-pointer"
            >
              Full Wallet Audit →
            </Link>
          )}
          <Link
            to="/check"
            className="btn-vibe text-xs px-4 py-2.5 rounded-xl theme-card font-extrabold text-[var(--text-primary)] hover:border-indigo-500/50 transition-all cursor-pointer"
          >
            Check Wallet Risk
          </Link>
        </div>
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
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20 font-bold">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="theme-card p-6 rounded-2xl space-y-2 shadow-lg hover-lift">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">
                {isCampaignAudit ? `Campaign #${activeId} Received Funds` : 'Total Donations Received'}
              </span>
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalDonations.toFixed(4)} ETH</p>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                {isCampaignAudit ? `Incoming ETH donations for Campaign #${activeId}` : 'Total incoming ETH on Sepolia testnet'}
              </p>
            </div>

            <div className="theme-card p-6 rounded-2xl space-y-2 shadow-lg hover-lift">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">
                {isCampaignAudit ? `Campaign #${activeId} Disbursed Funds` : 'Total Funds Disbursed'}
              </span>
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalDisbursements.toFixed(4)} ETH</p>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                {isCampaignAudit ? `Outgoing ETH withdrawals for Campaign #${activeId}` : 'Total outgoing ETH transfers recorded on-chain'}
              </p>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="theme-card p-6 rounded-2xl space-y-4 shadow-lg hover-lift">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Donations & Disbursements Timeline</h3>
              <span className="text-xs text-[var(--text-muted)] font-bold">
                {isCampaignAudit ? `Campaign #${activeId} Audit Trail` : 'Synchronized by Date'}
              </span>
            </div>

            {chartData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-12 text-center font-medium">No donation or disbursement timeline data available for this target.</p>
            ) : (
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '0.75rem',
                        color: 'var(--text-primary)',
                        fontWeight: 'bold',
                        boxShadow: 'var(--shadow-lg)',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar dataKey="Donations" name="Donations Received (ETH)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Disbursements" name="Funds Disbursed (ETH)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Transaction History Table */}
          <div className="theme-card p-6 rounded-2xl space-y-4 shadow-lg hover-lift">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
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
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Amount (ETH)</th>
                      <th className="py-3 px-3">TxHash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {transactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-[var(--border-subtle)]/30 font-mono transition-colors">
                        <td className="py-3 px-3 text-[var(--text-secondary)] font-sans font-medium">
                          {tx.date} <span className="text-[10px] text-[var(--text-muted)] font-mono ml-1">({tx.time})</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-extrabold ${
                              tx.type.includes('Donation')
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
