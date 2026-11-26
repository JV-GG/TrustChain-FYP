import axios from 'axios';
import { formatEther } from 'viem';
import { checkBlacklist } from './blacklistChecker.js';

const CHAIN_IDS = { sepolia: 11155111, mainnet: 1 };

/**
 * Fetches a wallet's normal transactions (ascending) and balance from Etherscan V2.
 * @returns {Promise<{transactions: Object[], balanceEth: string, dataError: string|null}>}
 */
export async function fetchWalletData(address, etherscanApiKey, network = 'sepolia') {
  const chainid = CHAIN_IDS[network];
  if (!chainid) throw new Error(`Unsupported network: ${network}`);
  const normalizedAddress = address ? address.toLowerCase().trim() : '';
  const apiKey = etherscanApiKey || 'YourApiKeyToken';

  let transactions = [];
  let balanceEth = '0.0000';
  // Set when Etherscan didn't return a tx list (rate limit, bad key), so callers can tell "empty" from "unknown"
  let dataError = null;

  // 1. Fetch Normal Transactions and Balance from Etherscan V2 API
  try {
    const txPromise = axios.get('https://api.etherscan.io/v2/api', {
      params: {
        chainid,
        module: 'account',
        action: 'txlist',
        address: normalizedAddress,
        startblock: 0,
        endblock: 99999999,
        sort: 'asc',
        apikey: apiKey,
      },
      timeout: 8000,
    });

    const balancePromise = axios.get('https://api.etherscan.io/v2/api', {
      params: {
        chainid,
        module: 'account',
        action: 'balance',
        address: normalizedAddress,
        tag: 'latest',
        apikey: apiKey,
      },
      timeout: 8000,
    });

    const [txRes, balanceRes] = await Promise.all([txPromise, balancePromise]);

    if (txRes.data && Array.isArray(txRes.data.result)) {
      transactions = txRes.data.result;
    } else {
      dataError = String(txRes.data?.result || txRes.data?.message || 'No tx list returned');
    }

    if (balanceRes.data && balanceRes.data.result && !isNaN(balanceRes.data.result)) {
      try {
        balanceEth = parseFloat(formatEther(BigInt(balanceRes.data.result))).toFixed(4);
      } catch {
        balanceEth = (Number(balanceRes.data.result) / 1e18).toFixed(4);
      }
    }
  } catch (error) {
    console.warn('Etherscan API fetch warning:', error.message);
    dataError = error.message;
  }

  return { transactions, balanceEth, dataError };
}

/**
 * Analyzes an Ethereum wallet address for potential security and fraud risks.
 * @param {string} address - Target Ethereum address
 * @param {string} etherscanApiKey - Etherscan API key
 * @param {'sepolia'|'mainnet'} [network='sepolia'] - Chain to read history from
 * @returns {Promise<Object>} Risk assessment report
 */
export async function analyseWallet(address, etherscanApiKey, network = 'sepolia') {
  const normalizedAddress = address ? address.toLowerCase().trim() : '';
  const [{ transactions, balanceEth, dataError }, blacklistDetails] = await Promise.all([
    fetchWalletData(normalizedAddress, etherscanApiKey, network),
    checkBlacklist(normalizedAddress),
  ]);
  const scored = scoreFromTransactions(
    normalizedAddress,
    transactions,
    blacklistDetails.isBlacklisted,
    Math.floor(Date.now() / 1000),
    blacklistDetails,
  );

  return {
    ...scored,
    balance: balanceEth,
    transactions: transactions.slice(-10).reverse(), // Last 10 txs descending
    isBlacklisted: blacklistDetails.isBlacklisted,
    blacklistDetails,
    network,
    dataError,
  };
}

/**
 * Pure scoring step shared by the app and evaluation/evaluate.mjs.
 * @param {string} address - Wallet being scored
 * @param {Object[]} transactions - Etherscan txlist rows, ascending by timeStamp
 * @param {boolean} isBlacklisted - Whether the blacklist signal fires
 * @param {number} nowTimestamp - Unix seconds that wallet age is measured to
 * @param {{source?: string, category?: string}|null} [blacklistDetails] - Only used for the signal's wording
 */
export function scoreFromTransactions(address, transactions, isBlacklisted, nowTimestamp, blacklistDetails = null) {
  const normalizedAddress = address ? address.toLowerCase().trim() : '';
  const txCount = transactions.length;

  let walletAge = 0; // in days
  if (txCount > 0 && transactions[0].timeStamp) {
    const firstTxTimestamp = Number(transactions[0].timeStamp);
    const ageInSeconds = Math.max(0, nowTimestamp - firstTxTimestamp);
    walletAge = Math.floor(ageInSeconds / 86400);
  }

  let totalReceived = 0;
  let totalSent = 0;
  const outgoingRecipients = new Set();

  transactions.forEach((tx) => {
    let valueInEth = 0;
    try {
      valueInEth = Number(formatEther(BigInt(tx.value || '0')));
    } catch {
      valueInEth = Number(tx.value || 0) / 1e18;
    }

    if (tx.to && tx.to.toLowerCase() === normalizedAddress) {
      totalReceived += valueInEth;
    }

    if (tx.from && tx.from.toLowerCase() === normalizedAddress) {
      totalSent += valueInEth;
      if (tx.to) {
        outgoingRecipients.add(tx.to.toLowerCase());
      }
    }
  });

  const uniqueRecipients = outgoingRecipients.size;

  let drainRatio = 0;
  if (totalReceived > 0) {
    drainRatio = totalSent / totalReceived;
  } else if (totalSent > 0) {
    drainRatio = 1.0;
  }

  const isNewWallet = walletAge < 30;
  const hasLowActivity = txCount < 5;

  // 4. Calculate Risk Score (0 - 100)
  let score = 0;
  const signals = [];

  // Wallet Age Score
  if (walletAge < 7) {
    score += 25;
    signals.push({
      name: 'Very New Wallet',
      impact: '+25 Risk',
      description: `First transaction recorded only ${walletAge} day(s) ago.`,
      isWarning: true,
    });
  } else if (walletAge >= 7 && walletAge <= 30) {
    score += 15;
    signals.push({
      name: 'New Wallet History',
      impact: '+15 Risk',
      description: `Wallet age is ${walletAge} days (< 30 days).`,
      isWarning: true,
    });
  } else {
    signals.push({
      name: 'Established Wallet',
      impact: '0 Risk',
      description: `Wallet active for ${walletAge} days.`,
      isWarning: false,
    });
  }

  // Tx Count Score
  if (txCount < 3) {
    score += 20;
    signals.push({
      name: 'Extremely Low Tx History',
      impact: '+20 Risk',
      description: `Only ${txCount} transaction(s) recorded on-chain.`,
      isWarning: true,
    });
  } else if (txCount >= 3 && txCount <= 10) {
    score += 10;
    signals.push({
      name: 'Low Transaction Volume',
      impact: '+10 Risk',
      description: `${txCount} transactions recorded on-chain.`,
      isWarning: true,
    });
  } else {
    signals.push({
      name: 'Active Transaction History',
      impact: '0 Risk',
      description: `${txCount} total transactions on-chain.`,
      isWarning: false,
    });
  }

  // Drain Ratio Score
  if (drainRatio > 0.9) {
    score += 30;
    signals.push({
      name: 'Rapid Fund Drain Detected',
      impact: '+30 Risk',
      description: `Drain ratio is ${(drainRatio * 100).toFixed(1)}% (over 90% of funds immediately transferred out).`,
      isWarning: true,
    });
  } else if (drainRatio >= 0.7 && drainRatio <= 0.9) {
    score += 15;
    signals.push({
      name: 'Elevated Outflow Ratio',
      impact: '+15 Risk',
      description: `Drain ratio is ${(drainRatio * 100).toFixed(1)}% of total incoming funds.`,
      isWarning: true,
    });
  } else {
    signals.push({
      name: 'Healthy Fund Retention',
      impact: '0 Risk',
      description: `Outflow ratio is within safe limits (${(drainRatio * 100).toFixed(1)}%).`,
      isWarning: false,
    });
  }

  // Recipient Diversity Score
  if (uniqueRecipients <= 2 && txCount > 5) {
    score += 15;
    signals.push({
      name: 'Low Recipient Diversity',
      impact: '+15 Risk',
      description: `Transferred to only ${uniqueRecipients} unique destination address(es).`,
      isWarning: true,
    });
  }

  // Blacklist Check Score
  if (isBlacklisted) {
    score += 40;
    signals.push({
      name: 'Blacklist Flagged',
      impact: '+40 Risk',
      description: `Address flagged on ${blacklistDetails?.source || 'MyEtherWallet Darklist'}${blacklistDetails?.category ? ` (${blacklistDetails.category})` : ''}.`,
      isWarning: true,
    });
  } else {
    signals.push({
      name: 'Blacklist Status Clear',
      impact: '0 Risk',
      description: 'No scam or phishing records found on the MyEtherWallet darklist.',
      isWarning: false,
    });
  }

  // Final Score Normalization (0-100)
  score = Math.min(100, Math.max(0, score));

  // Determine Risk Level
  let riskLevel = 'LOW';
  if (score >= 76) {
    riskLevel = 'CRITICAL';
  } else if (score >= 51) {
    riskLevel = 'HIGH';
  } else if (score >= 26) {
    riskLevel = 'MEDIUM';
  }

  return {
    score,
    riskLevel,
    signals,
    walletAge,
    txCount,
    totalReceived: totalReceived.toFixed(4),
    totalSent: totalSent.toFixed(4),
    drainRatio: (drainRatio * 100).toFixed(1),
    isNewWallet,
    hasLowActivity,
  };
}
