import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { formatEther } from 'viem';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useTheme } from '../hooks/useTheme';
import { Notice, StatStrip } from '../components/ui';
import { plural, shortAddr } from '../lib/format';

const CHART_COLORS = {
  light: { donation: '#0f6b47', disbursement: '#111613', grid: '#e6e9e3', axis: '#5e6661', surface: '#ffffff', rule: '#daddd8', ink: '#111613' },
  dark: { donation: '#4cc38a', disbursement: '#eef1ec', grid: '#2a322d', axis: '#959d97', surface: '#161b18', rule: '#2a322d', ink: '#eef1ec' },
};

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
  const [tab, setTab] = useState('all');
  const { theme } = useTheme();
  const colors = CHART_COLORS[theme] || CHART_COLORS.light;

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
        } else {
          setErrorMsg(
            isCampaignAudit
              ? 'Etherscan did not return the transaction history, so the chart and table are empty. The totals come straight from the contract. Try again in a moment.'
              : 'Etherscan did not return the transaction history for this wallet. Try again in a moment.'
          );
        }

        const processedTxs = [];
        let donationsSum = 0;
        let disbursementsSum = 0;
        const monthlyTimeline = {};

        // A campaign audit only counts calls that touch this campaign: matched by event log or by
        // the campaignId in the first calldata argument (donate, disburseFunds, deactivateCampaign)
        const belongsToCampaign = (tx) => {
          if (matchingHashes.has((tx.hash || '').toLowerCase())) return true;
          if (tx.input && tx.input.length >= 74) {
            try {
              return BigInt('0x' + tx.input.slice(10, 74)) === targetCampaignId;
            } catch {
              return false;
            }
          }
          return false;
        };

        rawTxs.forEach((tx) => {
          if (isCampaignAudit && !belongsToCampaign(tx)) return;
          if (tx.isError === '1') return;
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


  const rows = transactions.filter(
    (tx) => tab === 'all' || (tab === 'in' ? tx.type === 'Donation' : tx.type === 'Disbursement')
  );
  const donationCount = transactions.filter((tx) => tx.type === 'Donation').length;
  const disbursementCount = transactions.length - donationCount;

  const stats = campaignDetails
    ? (() => {
        const raised = Number(campaignDetails.raised);
        const out = Number(campaignDetails.disbursed);
        const held = Math.max(0, raised - out);
        return [
          { label: 'Donated', value: raised.toFixed(4), unit: 'ETH', note: plural(donationCount, 'donation') },
          { label: 'Disbursed', value: out.toFixed(4), unit: 'ETH', note: plural(disbursementCount, 'withdrawal') },
          { label: 'Held in vault', value: held.toFixed(4), unit: 'ETH', accent: true, note: raised > 0 ? `${Math.round((held / raised) * 100)}% of donations` : 'Nothing raised yet' },
          {
            label: 'Goal',
            value: Number(campaignDetails.goal).toFixed(2),
            unit: 'ETH',
            note: !campaignDetails.isActive ? 'Closed' : raised >= Number(campaignDetails.goal) ? 'Goal reached' : 'Raising',
          },
        ];
      })()
    : [
        { label: 'Received', value: totalDonations.toFixed(4), unit: 'ETH', note: `${donationCount} incoming` },
        { label: 'Sent out', value: totalDisbursements.toFixed(4), unit: 'ETH', note: `${disbursementCount} outgoing` },
        { label: 'Net', value: (totalDonations - totalDisbursements).toFixed(4), unit: 'ETH', accent: true },
      ];

  return (
    <div className="page pt-8 pb-24 flex flex-col gap-7">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)] flex gap-2 items-center flex-wrap">
        <Link to="/campaigns" className="text-[var(--ink-2)] no-underline hover:underline py-3">Campaigns</Link>
        <span aria-hidden="true">/</span>
        {isCampaignAudit ? (
          <>
            <Link to={`/campaigns/${activeId}`} className="text-[var(--ink-2)] no-underline hover:underline py-3">#{activeId.padStart(2, '0')}</Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span className="text-[var(--ink)]">Audit</span>
      </nav>

      <div className="flex justify-between items-end gap-5 flex-wrap">
        <div className="flex flex-col gap-2.5 min-w-0">
          <span className="eyebrow">{isCampaignAudit ? `Audit trail · campaign #${activeId}` : 'Wallet audit'}</span>
          <h1 className="h1 break-words">
            {isCampaignAudit ? campaignDetails?.title || `Campaign #${activeId}` : <span className="mono text-[clamp(20px,3vw,32px)] tracking-normal break-all">{targetAddress || 'Unknown address'}</span>}
          </h1>
          {isCampaignAudit && campaignDetails && (
            <p className="m-0 text-sm text-[var(--ink-2)]">
              Creator <span className="mono text-[var(--ink)]">{shortAddr(campaignDetails.owner, 8, 6)}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isCampaignAudit && campaignDetails?.owner && (
            <Link to={`/audit/${campaignDetails.owner}`} className="btn btn-secondary">Creator's wallet audit</Link>
          )}
          <a
            href={`https://sepolia.etherscan.io/address/${isCampaignAudit ? CONTRACT_ADDRESS : targetAddress}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            View on Etherscan ↗
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <span className="skeleton h-28" />
          <span className="skeleton h-72" />
          <span className="skeleton h-64" />
        </div>
      ) : (
        <>
          {errorMsg && <Notice tone="error">{errorMsg}</Notice>}

          <StatStrip items={stats} />

          <section aria-label="Money in and out" className="card p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.02em]">Money in and out, by day</h2>
              <div className="flex gap-[18px] text-[13px] text-[var(--ink-2)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colors.donation }} />
                  Donations
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colors.disbursement }} />
                  Disbursements
                </span>
              </div>
            </div>

            {chartData.length === 0 ? (
              <p className="m-0 py-12 text-center text-sm text-[var(--ink-3)]">No donations or disbursements to chart yet.</p>
            ) : (
              <figure className="m-0 h-72 w-full" aria-label={`Daily donations and disbursements across ${chartData.length} days`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4} barSize={24}>
                    <CartesianGrid vertical={false} stroke={colors.grid} />
                    <XAxis dataKey="date" stroke={colors.axis} tickLine={false} axisLine={{ stroke: colors.rule }} tick={{ fontSize: 12 }} />
                    <YAxis stroke={colors.axis} tickLine={false} axisLine={false} tick={{ fontSize: 11, fontFamily: 'Geist Mono, ui-monospace, monospace' }} width={48} />
                    <Tooltip
                      cursor={{ fill: colors.grid, opacity: 0.5 }}
                      formatter={(value) => [`${Number(value).toFixed(4)} ETH`]}
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.rule}`,
                        borderRadius: 10,
                        color: colors.ink,
                        fontSize: 13,
                      }}
                      labelStyle={{ color: colors.ink, fontWeight: 600 }}
                    />
                    <Bar dataKey="Donations" fill={colors.donation} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Disbursements" fill={colors.disbursement} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </figure>
            )}
          </section>

          <section className="flex flex-col gap-3.5">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="h3">Every transaction</h2>
              <div role="group" aria-label="Filter transactions" className="seg">
                {[
                  ['all', 'All'],
                  ['in', isCampaignAudit ? 'Donations' : 'Incoming'],
                  ['out', isCampaignAudit ? 'Disbursements' : 'Outgoing'],
                ].map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="seg-item">
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card overflow-x-auto">
              {rows.length === 0 ? (
                <p className="m-0 p-8 text-center text-sm text-[var(--ink-3)]">No transactions in this view.</p>
              ) : (
                <table className="ledger min-w-[680px]">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Type</th>
                      <th scope="col">From → to</th>
                      <th scope="col" className="num">Amount</th>
                      <th scope="col">Tx hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((tx) => (
                      <tr key={tx.hash}>
                        <td className="text-[var(--ink-2)] whitespace-nowrap">
                          {tx.date} <span className="text-[var(--ink-3)]">{tx.time}</span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-2 font-medium">
                            <span className="w-2 h-2 rounded-sm" style={{ background: tx.type === 'Donation' ? colors.donation : colors.disbursement }} />
                            {tx.type}
                          </span>
                        </td>
                        <td className="mono text-[13px] text-[var(--ink-2)] whitespace-nowrap">
                          {shortAddr(tx.from)} → {shortAddr(tx.to)}
                        </td>
                        <td className="num font-semibold whitespace-nowrap">
                          {tx.type === 'Donation' ? '+' : '−'}
                          {tx.value.toFixed(4)} ETH
                        </td>
                        <td>
                          <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="link mono text-[13px] font-normal">
                            {shortAddr(tx.hash, 6, 4)} ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
