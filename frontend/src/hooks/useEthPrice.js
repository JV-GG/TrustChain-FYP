import { useState, useEffect } from 'react';

/**
 * Fetches the current ETH price in USD from CoinGecko's free API.
 * Returns { ethPrice, isLoading }.
 * Falls back to 0 if the fetch fails.
 */
export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { signal: AbortSignal.timeout(6000) }
        );
        const data = await res.json();
        if (!cancelled && data?.ethereum?.usd) {
          setEthPrice(data.ethereum.usd);
        }
      } catch {
        // silently fail — USD display just won't show
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPrice();

    // Refresh price every 60 seconds
    const interval = setInterval(fetchPrice, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { ethPrice, isLoading };
}

/**
 * Format a USD value for display.
 */
export function formatUsd(ethAmount, ethPrice) {
  if (!ethAmount || !ethPrice) return null;
  const usd = Number(ethAmount) * ethPrice;
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
