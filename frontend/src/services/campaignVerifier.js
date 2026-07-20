import { analyseWallet } from './riskEngine';
import { checkBlacklist } from './blacklistChecker';

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

    // Badge classification rules
    if (isBlacklisted || score >= 76) {
      return {
        verified: false,
        badge: 'FLAGGED',
        score,
        riskLevel: 'CRITICAL',
        reason: isBlacklisted
          ? `Campaign owner wallet is blacklisted on CryptoScamDB (${blacklistReport.category || 'Malicious'})`
          : 'Campaign owner wallet is flagged as high risk by automated risk engine',
      };
    }

    if (score >= 51) {
      return {
        verified: false,
        badge: 'UNVERIFIED',
        score,
        riskLevel: 'HIGH',
        reason: 'Campaign owner wallet shows high risk signals (rapid drain or suspicious transfers)',
      };
    }

    if (score >= 26) {
      return {
        verified: false,
        badge: 'CAUTION',
        score,
        riskLevel: 'MEDIUM',
        reason: 'Campaign owner wallet shows some risk signals (new wallet or low activity)',
      };
    }

    // Score 0-25 and not blacklisted
    return {
      verified: true,
      badge: 'VERIFIED',
      score,
      riskLevel: 'LOW',
      reason: 'Campaign owner wallet passes all risk checks',
    };
  } catch (error) {
    console.error('Campaign verification error:', error);
    return {
      verified: false,
      badge: 'CAUTION',
      score: 30,
      riskLevel: 'MEDIUM',
      reason: 'Verification service temporary warning — proceed with caution',
    };
  }
}
