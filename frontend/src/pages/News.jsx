import React, { useState, useEffect, useMemo } from 'react';
import { fetchCryptoNews } from '../services/newsService';
import { EmptyState, SearchIcon, Spinner } from '../components/ui';
import { timeAgo } from '../lib/format';

const CATEGORIES = [
  'All Crypto',
  'DeFi & Web3',
  'Security & Audits',
  'Bitcoin & Ethereum',
  'Regulations & Policy',
  'Market Sentiment',
];

const CATEGORY_LABEL = {
  'All Crypto': 'All',
  'DeFi & Web3': 'DeFi',
  'Security & Audits': 'Security',
  'Bitcoin & Ethereum': 'BTC & ETH',
  'Regulations & Policy': 'Regulation',
  'Market Sentiment': 'Markets',
};

/** Article image that removes itself if the source fails, so layouts collapse instead of showing a blank box. */
function NewsImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return null;
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} onError={() => setFailed(true)} />;
}

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Crypto');
  const [selectedImpact, setSelectedImpact] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [copiedId, setCopiedId] = useState(null);

  const loadNewsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetchCryptoNews();
      setNews(res.items);
      setLastUpdated(res.updatedAt);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNewsData();
    const interval = setInterval(() => loadNewsData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return news
      .filter((item) => {
        const matchSearch =
          q === '' ||
          item.title.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q);
        const matchCategory = selectedCategory === 'All Crypto' || (item.categories && item.categories.includes(selectedCategory));
        const matchImpact = selectedImpact === 'all' || item.impact === selectedImpact;
        return matchSearch && matchCategory && matchImpact;
      })
      .sort((a, b) => {
        if (sortBy === 'impact') {
          const weight = { high: 3, medium: 2, low: 1 };
          return (weight[b.impact] || 0) - (weight[a.impact] || 0);
        }
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      });
  }, [news, searchQuery, selectedCategory, selectedImpact, sortBy]);

  // The lead story is the first high-impact item in the current view
  const lead = filteredNews.find((n) => n.impact === 'high') || null;
  const rest = filteredNews.filter((n) => n !== lead);

  const handleCopy = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Crypto');
    setSelectedImpact('all');
  };

  return (
    <div className="page pt-14 pb-24 flex flex-col gap-7">
      <div className="flex justify-between items-end gap-5 flex-wrap">
        <div className="flex flex-col gap-2.5 max-w-[40rem]">
          <h1 className="h1">News</h1>
          <p className="lead">Scams, exploits and rule changes that affect how you give on-chain. High-impact stories are pinned first.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-[13px] text-[var(--ink-3)]">Updated {timeAgo(lastUpdated)}</span>}
          <button type="button" onClick={() => loadNewsData(true)} disabled={refreshing} className="btn btn-secondary">
            {refreshing ? (
              <>
                <Spinner />
                Refreshing…
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div role="group" aria-label="Topic" className="seg">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className="seg-item"
              >
                {CATEGORY_LABEL[category]}
              </button>
            ))}
          </div>
          <label className="field-group flex-[0_1_360px] min-w-[240px]">
            <SearchIcon />
            <span className="sr-only">Search news</span>
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search ETH, exploit, regulation…" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="impact">Impact</label>
          <select id="impact" value={selectedImpact} onChange={(e) => setSelectedImpact(e.target.value)} className="field w-auto min-h-11 text-sm pr-8">
            <option value="all">Any impact</option>
            <option value="high">High impact only</option>
            <option value="medium">Standard only</option>
          </select>
          <label className="sr-only" htmlFor="sort">Sort</label>
          <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="field w-auto min-h-11 text-sm pr-8">
            <option value="latest">Latest first</option>
            <option value="impact">Highest impact first</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <span className="skeleton h-[280px] rounded-2xl" />
          <span className="skeleton h-[420px]" />
        </div>
      ) : filteredNews.length === 0 ? (
        <EmptyState
          title="No stories match"
          action={
            <button type="button" onClick={resetFilters} className="btn btn-primary">
              Clear filters
            </button>
          }
        >
          Nothing in the feed matches this search or topic.
        </EmptyState>
      ) : (
        <>
          {lead && (
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="grid rounded-2xl overflow-hidden no-underline bg-[var(--invert-bg)] text-[var(--invert-ink)]"
              style={{ gridTemplateColumns: lead.image ? 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))' : 'minmax(0, 46rem)' }}
            >
              <div className="p-7 sm:p-9 flex flex-col gap-4 justify-between min-h-[260px] max-w-[46rem]">
                <div className="flex gap-2.5 items-center flex-wrap">
                  <span className="badge tone-flagged">High impact</span>
                  <span className="text-[13px] text-[var(--invert-ink-2)]">
                    {lead.source} · {timeAgo(lead.publishedAt)}
                  </span>
                </div>
                <span className="text-[clamp(24px,3vw,30px)] leading-tight tracking-[-0.03em] font-bold text-balance">{lead.title}</span>
                <span className="text-[15px] leading-relaxed text-[var(--invert-ink-2)] line-clamp-3">{lead.body}</span>
                <span className="text-sm font-semibold">Read article ↗</span>
              </div>
              {lead.image && <NewsImage src={lead.image} alt="" className="w-full h-full min-h-[220px]" />}
            </a>
          )}

          {rest.length > 0 && (
            <section aria-label="Stories" className="card">
              {rest.map((item, i) => (
                <article
                  key={item.id}
                  className={`grid gap-x-6 gap-y-2 px-6 py-5 items-start ${i < rest.length - 1 ? 'border-b border-[var(--rule-soft)]' : ''}`}
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex gap-2.5 items-center flex-wrap text-[13px] text-[var(--ink-3)]">
                      {item.impact === 'high' && <span className="badge tone-flagged">High impact</span>}
                      <span>
                        {item.categories?.[0] ? `${CATEGORY_LABEL[item.categories[0]] || item.categories[0]} · ` : ''}
                        {item.source}
                      </span>
                    </div>
                    <h3 className="m-0 text-[17px] font-semibold tracking-[-0.015em] leading-snug">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[var(--ink)] no-underline hover:underline">
                        {item.title}
                      </a>
                    </h3>
                    <p className="m-0 text-sm leading-normal text-[var(--ink-2)] line-clamp-2">{item.body}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[13px] text-[var(--ink-3)] whitespace-nowrap">{timeAgo(item.publishedAt)}</span>
                    {item.image && (
                      <NewsImage src={item.image} alt="" className="hidden sm:block w-28 h-20 rounded-lg" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.url)}
                      className="bg-transparent border-0 p-0 min-h-11 text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer font-[inherit] whitespace-nowrap"
                    >
                      {copiedId === item.id ? 'Link copied' : 'Copy link'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
