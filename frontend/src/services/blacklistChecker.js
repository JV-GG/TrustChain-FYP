// Import attribute lets Node (evaluation/evaluate.mjs) load the same module Vite bundles
import darklist from '../data/darklist.json' with { type: 'json' };

const DARKLIST = new Map(darklist.map((entry) => [entry.address.toLowerCase(), entry]));

/**
 * Checks an Ethereum address against the bundled MyEtherWallet darklist.
 * @param {string} address - The Ethereum address to check.
 * @returns {Promise<{isBlacklisted: boolean, source: string|null, category: string|null}>}
 */
export async function checkBlacklist(address) {
  const entry = address ? DARKLIST.get(address.toLowerCase().trim()) : undefined;
  if (!entry) {
    return { isBlacklisted: false, source: null, category: null };
  }
  return { isBlacklisted: true, source: 'MyEtherWallet Darklist', category: entry.comment };
}
