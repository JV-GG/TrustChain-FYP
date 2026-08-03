/**
 * Crypto News Ingestion Service
 * Inspired by SignalTrade news ingestion pipeline.
 * Fetches real-time crypto news from CryptoCompare API / RSS feeds and provides category & impact tagging.
 */

const CRYPTOCOMPARE_API_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

// Fallback news dataset with reliable images and gradient fallbacks
const FALLBACK_NEWS = [
  {
    id: 'fb-1',
    title: 'Ethereum Layer 2 TVL Hits New Record High as Staking Demand Surges',
    body: 'Total value locked across Ethereum Layer 2 scaling networks has exceeded $45 billion. Major contributors include Arbitrum, Base, and Optimism with surging activity in decentralized finance.',
    url: 'https://coindesk.com',
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=800&q=80',
    source: 'CoinDesk',
    sourceIcon: '⚡',
    publishedAt: Date.now() - 1000 * 60 * 12, // 12 mins ago
    categories: ['DeFi & Web3', 'Bitcoin & Ethereum'],
    impact: 'high',
    tags: ['ETH', 'Layer 2', 'TVL', 'DeFi'],
  },
  {
    id: 'fb-2',
    title: 'Smart Contract Audit Standard Adopted Across Major DeFi Protocols',
    body: 'Leading blockchain security firms have announced a unified verification framework to detect automated reentrancy and flash loan vulnerabilities before deployment on mainnet.',
    url: 'https://cointelegraph.com',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80',
    source: 'CoinTelegraph',
    sourceIcon: '🛡️',
    publishedAt: Date.now() - 1000 * 60 * 45, // 45 mins ago
    categories: ['Security & Audits', 'DeFi & Web3'],
    impact: 'high',
    tags: ['Audit', 'Security', 'Smart Contracts'],
  },
  {
    id: 'fb-3',
    title: 'Global Regulators Propose Clear Licensing Rules for Crypto Custody Platforms',
    body: 'Financial regulators from the EU and Asia have released updated guidelines for cryptocurrency custodians, emphasizing transparent proof-of-reserves and segregated customer funds.',
    url: 'https://decrypt.co',
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80',
    source: 'Decrypt',
    sourceIcon: '📜',
    publishedAt: Date.now() - 1000 * 60 * 90, // 1.5 hrs ago
    categories: ['Regulations & Policy'],
    impact: 'medium',
    tags: ['Regulation', 'Custody', 'Compliance'],
  },
  {
    id: 'fb-4',
    title: 'Bitcoin Market Dominance Holds Firm Near 56% Amid Institutional ETF Inflows',
    body: 'Institutional demand for Bitcoin spot ETFs continues to bolster market confidence, with net daily inflows rebounding strongly despite short-term macro volatility.',
    url: 'https://bitcoinmagazine.com',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    source: 'Bitcoin Magazine',
    sourceIcon: '₿',
    publishedAt: Date.now() - 1000 * 60 * 180, // 3 hrs ago
    categories: ['Bitcoin & Ethereum', 'Market Sentiment'],
    impact: 'high',
    tags: ['BTC', 'ETF', 'Institutional'],
  },
  {
    id: 'fb-5',
    title: 'Security Alert: Flash Loan Attack Exploits Unverified Yield Pool',
    body: 'Automated monitoring bots flagged a manipulation attack targeting a newly deployed liquidity pool. Whitehat auditors managed to pause funds and secure 80% of exposed assets.',
    url: 'https://blockworks.co',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    source: 'Blockworks',
    sourceIcon: '🚨',
    publishedAt: Date.now() - 1000 * 60 * 300, // 5 hrs ago
    categories: ['Security & Audits', 'DeFi & Web3'],
    impact: 'high',
    tags: ['Exploit', 'Security', 'DeFi Alert'],
  },
  {
    id: 'fb-6',
    title: 'Zero-Knowledge Proof Infrastructure Reaches Milestone in Cross-Chain Messaging',
    body: 'Web3 developers launch new ZK-rollout bridge reducing transaction confirmation latency while maintaining cryptographic verification guarantee across chains.',
    url: 'https://coindesk.com',
    image: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=800&q=80',
    source: 'CoinDesk',
    sourceIcon: '⚡',
    publishedAt: Date.now() - 1000 * 60 * 420, // 7 hrs ago
    categories: ['DeFi & Web3'],
    impact: 'medium',
    tags: ['ZK-Rollups', 'Cross-chain', 'Infrastructure'],
  }
];

/**
 * Categorizes an article into TrustChain news categories
 */
function categorizeArticle(title = '', body = '', rawCategories = '') {
  const text = `${title} ${body} ${rawCategories}`.toLowerCase();
  const categories = new Set();

  if (text.includes('sec') || text.includes('regulation') || text.includes('law') || text.includes('court') || text.includes('legal') || text.includes('policy') || text.includes('tax') || text.includes('license')) {
    categories.add('Regulations & Policy');
  }

  if (text.includes('hack') || text.includes('exploit') || text.includes('audit') || text.includes('security') || text.includes('vulnerability') || text.includes('scam') || text.includes('phishing') || text.includes('risk')) {
    categories.add('Security & Audits');
  }

  if (text.includes('btc') || text.includes('bitcoin') || text.includes('eth') || text.includes('ethereum') || text.includes('layer 2') || text.includes('l2') || text.includes('solana')) {
    categories.add('Bitcoin & Ethereum');
  }

  if (text.includes('defi') || text.includes('web3') || text.includes('nft') || text.includes('yield') || text.includes('tvl') || text.includes('staking') || text.includes('swap') || text.includes('protocol') || text.includes('token')) {
    categories.add('DeFi & Web3');
  }

  if (categories.size === 0 || text.includes('market') || text.includes('price') || text.includes('trader') || text.includes('etf')) {
    categories.add('Market Sentiment');
  }

  return Array.from(categories);
}

/**
 * Normalizes raw CryptoCompare item into standard format
 */
function normalizeNewsItem(item) {
  const title = item.title ? item.title.trim() : 'Crypto Market Update';
  const body = item.body ? item.body.replace(/<[^>]+>/g, '').trim() : '';
  const publishedAt = item.published_on ? item.published_on * 1000 : Date.now();
  const categories = categorizeArticle(title, body, item.categories || '');
  
  // Calculate impact
  const isHighImpact = title.toLowerCase().includes('hack') || 
                       title.toLowerCase().includes('etf') || 
                       title.toLowerCase().includes('sec') || 
                       title.toLowerCase().includes('record') ||
                       title.toLowerCase().includes('billion');

  // Fix image URL format (CryptoCompare returns relative paths like "/media/...")
  let image = item.imageurl || '';
  if (image && image.startsWith('/')) {
    image = `https://www.cryptocompare.com${image}`;
  }

  return {
    id: item.id || `news-${Math.random()}`,
    title,
    body: body.length > 220 ? `${body.slice(0, 217)}...` : body,
    url: item.url || '#',
    image: image || null,
    source: item.source_info?.name || item.source || 'Crypto Feed',
    sourceIcon: item.source_info?.img || '📰',
    publishedAt,
    categories,
    impact: isHighImpact ? 'high' : 'medium',
    tags: (item.tags || '').split('|').filter(Boolean).slice(0, 4),
  };
}

/**
 * Main fetch function with API call & fallback handling
 */
export async function fetchCryptoNews() {
  try {
    const response = await fetch(CRYPTOCOMPARE_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    if (data && Array.isArray(data.Data) && data.Data.length > 0) {
      const items = data.Data.map(normalizeNewsItem);
      return {
        success: true,
        items,
        source: 'live_api',
        updatedAt: Date.now(),
      };
    }
  } catch (err) {
    console.warn('[NewsService] API fetch failed, loading resilient fallback data:', err);
  }

  // Fallback if network call fails or returns empty
  return {
    success: true,
    items: FALLBACK_NEWS,
    source: 'fallback_cache',
    updatedAt: Date.now(),
  };
}
