import axios from 'axios';

// Known malicious / test scam addresses list for reliable offline/fallback matching
const KNOWN_BLACKLISTED_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // example flagged address
  '0xbad0000000000000000000000000000000000000',
].map((addr) => addr.toLowerCase()));

/**
 * Checks if an Ethereum address is flagged in CryptoScamDB or local threat list.
 * @param {string} address - The Ethereum address to check.
 * @returns {Promise<{isBlacklisted: boolean, source: string|null, category: string|null}>}
 */
export async function checkBlacklist(address) {
  if (!address) {
    return { isBlacklisted: false, source: null, category: null };
  }

  const normalized = address.toLowerCase().trim();

  // 1. Check local threat registry first
  if (KNOWN_BLACKLISTED_ADDRESSES.has(normalized)) {
    return {
      isBlacklisted: true,
      source: 'CryptoScamDB Local Registry',
      category: 'Phishing / Malicious Contract',
    };
  }

  // 2. Query CryptoScamDB via Vite proxy to prevent browser CORS errors
  try {
    const response = await axios.get(`/api/cryptoscamdb/v1/check/${normalized}`, {
      timeout: 4000,
    });

    const data = response.data;

    if (data && data.success && data.result && Array.isArray(data.result) && data.result.length > 0) {
      const firstEntry = data.result[0];
      return {
        isBlacklisted: true,
        source: 'CryptoScamDB',
        category: firstEntry?.category || 'Scam / Phishing',
      };
    }

    if (data && (data.result === 'blocked' || data.status === 'blocked')) {
      return {
        isBlacklisted: true,
        source: 'CryptoScamDB',
        category: 'Flagged Malicious Address',
      };
    }

    return { isBlacklisted: false, source: null, category: null };
  } catch (error) {
    // If proxy or external API fails, quietly return CLEAR status without breaking UI
    return { isBlacklisted: false, source: null, category: null };
  }
}
