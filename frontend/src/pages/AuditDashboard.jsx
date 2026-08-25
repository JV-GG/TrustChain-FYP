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
  const activeId = (routeCampaignId || identifier || '').trim();

  const isWalletAddress = /^0x[a-fA-F0-9]{40}$/.test(activeId);
  const isCampaignAudit = Boolean(routeCampaignId) || (!isWalletAddress && /^\d+$/.test(activeId));

  const targetCampaignId = isCampaignAudit ? BigInt(activeId) : null;
  const targetAddress = isWalletAddress ? activeId.toLowerCase() : '';

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

        // 2. Query Etherscan for contract transaction list & logs
        const topic1Hex = targetCampaignId
          ? '0x' + targetCampaignId.toString(16).padStart(64, '0')
          : null;

        const [txRes, logRes] = await Promise.all([
          axios.get('https://api.etherscan.io/v2/api', {
            params: {
              chainid: 11155111,
              module: 'account',
              action: 'txlist',
              address: isCampaignAudit ? CONTRACT_ADDRESS : targetAddress,
              startblock: 0,
              endblock: 99999999,
              sort: 'desc',
              apikey: apiKey,
            },
            timeout: 10000,
          }).catch(() => null),
          topic1Hex
            ? axios.get('https://api.etherscan.io/v2/api', {
                params: {
                  chainid: 11155111,
                  module: 'logs',
                  action: 'getLogs',
                  address: CONTRACT_ADDRESS,
                  topic1: topic1Hex,
                  startblock: 0,
                  endblock: 99999999,
                  apikey: apiKey,
                },
                timeout: 10000,
              }).catch(() => null)
            : Promise.resolve(null),
        ]);

        const matchingHashes = new Set();
        if (logRes?.data && Array.isArray(logRes.data.result)) {
          logRes.data.result.forEach((log) => {
            if (log.transactionHash) {
              matchingHashes.add(log.transactionHash.toLowerCase());
            }
          });
        }

        let rawTxs = [];
        if (txRes?.data && Array.isArray(txRes.data.result)) {
          rawTxs = txRes.data.result;
        }

        const processedTxs = [];
        let donationsSum = 0;
        let disbursementsSum = 0;
        const monthlyTimeline = {};

        rawTxs.forEach((tx) => {
          const valEth = Number(formatEther(BigInt(tx.value || '0')));
          const fnName = (tx.functionName || '').toLowerCase();
          const fromAddr = (tx.from || '').toLowerCase();
          const toAddr = (tx.to || '').toLowerCase();

          let type = '';
          let calculatedValEth = valEth;

          // Case A: Disburse
          if (fnName.includes('disburse')) {
            type = 'Disbursement';
            let calldataDisburseAmount = 0n;
            if (tx.input && tx.input.length >= 138) {
              try {
                calldataDisburseAmount = BigInt('0x' + tx.input.slice(74, 138));
              } catch {}
            }
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8 animate-apple-fade-in">
      
      {/* ── Apple Inspector Header ── */}
      <div className="border-b border-[var(--border-color)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="caption-label px-3 py-1 rounded-full bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)] inline-block">
            {isCampaignAudit ? 'Campaign Audit Dossier' : 'Wallet Audit Dossier'}
          </span>
          <h1 className="section-title text-[var(--text-primary)]">
            {isCampaignAudit && campaignDetails
              ? `Audit: Campaign #${campaignDetails.id} - ${campaignDetails.title}`
              : isCampaignAudit
              ? `Audit: Campaign #${activeId}`
              : 'Wallet Audit Dashboard'}
          </h1>
          <p className="text-[var(--text-muted)] font-mono text-xs break-all pt-0.5">
            {isCampaignAudit && campaignDetails ? (
              <span>
                Creator Address: <span className="text-[var(--apple-green)] font-semibold">{campaignDetails.owner}</span> | Goal: {campaignDetails.goal} ETH
              </span>
            ) : (
              <span>
                Target Address: <span className="text-[var(--apple-green)] font-semibold">{targetAddress || 'N/A'}</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCampaignAudit && campaignDetails?.owner && (
            <Link
              to={`/audit/${campaignDetails.owner}`}
              className="text-xs px-4 py-2 rounded-full apple-glass font-semibold text-[var(--apple-green)] hover:border-[var(--apple-green-border)] transition-all cursor-pointer apple-press"
            >
              Full Wallet Audit →
            </Link>
          )}
          <Link
            to="/check"
            className="text-xs px-4 py-2 rounded-full apple-glass font-semibold text-[var(--text-primary)] hover:border-[var(--apple-blue-border)] transition-all cursor-pointer apple-press"
          >
            Check Wallet Risk
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-[var(--border-color)] rounded-3xl"></div>
            <div className="h-28 bg-[var(--border-color)] rounded-3xl"></div>
          </div>
          <div className="h-64 bg-[var(--border-color)] rounded-3xl"></div>
        </div>
      ) : (
        <>
          {errorMsg && (
            <p className="text-xs text-[var(--apple-red)] bg-[var(--apple-red-tint)] p-3.5 rounded-2xl border border-[var(--apple-red-border)] font-medium">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* ── Stats Summary Cards (Apple Health Style) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="apple-glass p-6 sm:p-7 rounded-3xl space-y-1.5 hover-lift">
              <span className="caption-label text-[var(--text-muted)]">
                {isCampaignAudit ? `Campaign #${activeId} Received Funds` : 'Total Donations Received'}
              </span>
              <p className="text-3xl sm:text-4xl font-extrabold text-[var(--apple-green)] tracking-tight">{totalDonations.toFixed(4)} ETH</p>
              <p className="text-xs text-[var(--text-secondary)] font-normal">
                {isCampaignAudit ? `Incoming ETH donations for Campaign #${activeId}` : 'Total incoming ETH on Sepolia testnet'}
              </p>
            </div>

            <div className="apple-glass p-6 sm:p-7 rounded-3xl space-y-1.5 hover-lift">
              <span className="caption-label text-[var(--text-muted)]">
                {isCampaignAudit ? `Campaign #${activeId} Disbursed Funds` : 'Total Funds Disbursed'}
              </span>
              <p className="text-3xl sm:text-4xl font-extrabold text-[var(--apple-blue)] tracking-tight">{totalDisbursements.toFixed(4)} ETH</p>
              <p className="text-xs text-[var(--text-secondary)] font-normal">
                {isCampaignAudit ? `Outgoing ETH withdrawals for Campaign #${activeId}` : 'Total outgoing ETH transfers recorded on-chain'}
              </p>
            </div>
          </div>

          {/* ── Recharts Bar Chart (Apple Translucent Theme) ── */}
          <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-4 hover-lift">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="headline text-[var(--text-primary)]">Donations & Disbursements Timeline</h3>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {isCampaignAudit ? `Campaign #${activeId} Audit Trail` : 'Synchronized by Date'}
              </span>
            </div>

            {chartData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-12 text-center font-normal">No donation or disbursement timeline data available for this target.</p>
            ) : (
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11, fontWeight: 500 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fontWeight: 500 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '1rem',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        boxShadow: 'var(--shadow-lg)',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                    <Bar dataKey="Donations" name="Donations Received (ETH)" fill="#34c759" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Disbursements" name="Funds Disbursed (ETH)" fill="#5856d6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Transaction History Table (Apple Grouped List) ── */}
          <div className="apple-glass p-6 sm:p-8 rounded-3xl space-y-4 hover-lift">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="headline text-[var(--text-primary)]">Transaction History</h3>
              <span className="text-xs text-[var(--text-muted)] font-mono font-medium">{transactions.length} Transactions</span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-8 text-center font-normal">No ETH donation or disbursement transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Amount (ETH)</th>
                      <th className="py-3 px-3">TxHash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {transactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-inset)] font-mono transition-colors">
                        <td className="py-3.5 px-3 text-[var(--text-secondary)] font-sans font-normal">
                          {tx.date} <span className="text-[10px] text-[var(--text-muted)] font-mono ml-1">({tx.time})</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              tx.type.includes('Donation')
                                ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] border border-[var(--apple-green-border)]'
                                : 'bg-[var(--apple-blue-tint)] text-[var(--apple-blue)] border border-[var(--apple-blue-border)]'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-[var(--text-primary)]">{tx.value.toFixed(4)} ETH</td>
                        <td className="py-3.5 px-3 text-[var(--apple-blue)] hover:underline font-medium">
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
