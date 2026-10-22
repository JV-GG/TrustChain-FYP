import { useEffect, useState } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';
import { verifyCampaign } from '../services/campaignVerifier';

/**
 * Loads every campaign from the escrow contract, then scores each unique
 * owner wallet in the background. Re-reads the count every `pollMs`.
 *
 * Returns { campaigns, verifications, loading, count } where verifications
 * is keyed by campaign id.
 */
export function useCampaigns({ pollMs = 6000 } = {}) {
  const publicClient = usePublicClient();
  const [campaigns, setCampaigns] = useState([]);
  const [verifications, setVerifications] = useState({});
  const [loading, setLoading] = useState(true);

  const { data: countData, refetch: refetchCount, isFetched } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCampaignCount',
  });
  const count = countData ? Number(countData) : 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!publicClient) return;
      if (!count) {
        if (isFetched) setLoading(false);
        return;
      }

      try {
        const raw = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getCampaign',
              args: [BigInt(i + 1)],
            })
          )
        );
        if (cancelled) return;

        const formatted = raw.map((c, i) => ({
          id: i + 1,
          owner: c.owner,
          title: c.title,
          description: c.description,
          ipfsHash: c.ipfsHash,
          goalAmount: c.goalAmount,
          raisedAmount: c.raisedAmount,
          disbursedAmount: c.disbursedAmount,
          isActive: c.isActive,
          createdAt: c.createdAt,
        }));
        setCampaigns(formatted);
        setLoading(false);

        // Score owners one at a time and publish each badge as it lands. Every check makes two
        // Etherscan calls, and a burst past the rate limit comes back empty, which the engine
        // would score as a brand-new wallet.
        const owners = [...new Set(formatted.map((c) => c.owner?.toLowerCase()).filter(Boolean))];
        const byOwner = {};
        for (const owner of owners) {
          try {
            byOwner[owner] = await verifyCampaign(owner);
          } catch {
            byOwner[owner] = null;
          }
          if (cancelled) return;

          const map = {};
          formatted.forEach((c) => {
            const res = byOwner[c.owner?.toLowerCase()];
            if (res) map[c.id] = res;
          });
          setVerifications(map);
        }
      } catch (err) {
        console.error('Failed to fetch campaigns on-chain:', err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [count, publicClient, isFetched]);

  useEffect(() => {
    if (!pollMs) return;
    const interval = setInterval(() => refetchCount(), pollMs);
    return () => clearInterval(interval);
  }, [refetchCount, pollMs]);

  return { campaigns, verifications, loading, count };
}
