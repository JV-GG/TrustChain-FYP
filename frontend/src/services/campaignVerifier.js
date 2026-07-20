import { analyseWallet } from './riskEngine';
import { checkBlacklist } from './blacklistChecker';

// Fast in-memory cache to prevent duplicate Etherscan API calls and make page loads instant (0ms cache hit)
const verificationCache = new Map();

/**
 * Verifies a campaign owner's wallet address by evaluating risk signals & blacklist status.
 * 
 * @param {string} ownerAddress - Wallet address of the campaign creator
 * @param {string} [etherscanApiKey] - Optional Etherscan API key
 * @returns {Promise<{
 *   verified: boolean,
 *   badge: 'VERIFIED' | 'CAUTION' | 'UNVERIFIED' | 'FLAGGED',
 *   score: number,
 *   riskLevel: string,
 *   reason: string
 * }>}
 */
export async function verifyCampaign(ownerAddress, etherscanApiKey) {
  if (!ownerAddress) {
    return {
      verified: false,
      badge: 'UNVERIFIED',
      score: 50,
      riskLevel: 'MEDIUM',
      reason: 'No owner address provided for verification.',
    };
  }

  const cacheKey = ownerAddress.toLowerCase();
  if (verificationCache.has(cacheKey)) {
    return verificationCache.get(cacheKey);
  }

  try {
    const apiKey = etherscanApiKey || import.meta.env.VITE_ETHERSCAN_API_KEY;
    
    // Run risk engine analysis and blacklist check concurrently
    const [riskReport, blacklistReport] = await Promise.all([
      analyseWallet(ownerAddress, apiKey),
      checkBlacklist(ownerAddress),
    ]);

    const isBlacklisted = blacklistReport?.isBlacklisted || false;
    const score = riskReport?.score ?? 0;
    const riskLevel = riskReport?.riskLevel || 'LOW';

    let result = null;

    // Badge classification rules
    if (isBlacklisted || score >= 76) {
      result = {
        verified: false,
        badge: 'FLAGGED',
        score,
        riskLevel: 'CRITICAL',
        reason: isBlacklisted
          ? `Campaign owner wallet is blacklisted on CryptoScamDB (${blacklistReport.category || 'Malicious'})`
          : 'Campaign owner wallet is flagged as high risk by automated risk engine',
      };
    } else if (score >= 51) {
      result = {
        verified: false,
        badge: 'UNVERIFIED',
        score,
        riskLevel: 'HIGH',
        reason: 'Campaign owner wallet shows high risk signals (rapid drain or suspicious transfers)',
      };
    } else if (score >= 26) {
      result = {
        verified: false,
        badge: 'CAUTION',
        score,
        riskLevel: 'MEDIUM',
        reason: 'Campaign owner wallet shows some risk signals (new wallet or low activity)',
      };
    } else {
      // Score 0-25 and not blacklisted
      result = {
        verified: true,
        badge: 'VERIFIED',
        score,
        riskLevel: 'LOW',
        reason: 'Campaign owner wallet passes all risk checks',
      };
    }

    verificationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Campaign verification error:', error);
    const fallbackResult = {
      verified: false,
      badge: 'CAUTION',
      score: 30,
      riskLevel: 'MEDIUM',
      reason: 'Verification service temporary warning — proceed with caution',
    };
    return fallbackResult;
  }
}
