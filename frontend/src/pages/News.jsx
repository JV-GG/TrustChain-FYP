import React, { useState, useEffect, useMemo } from 'react';
import { fetchCryptoNews } from '../services/newsService';

const CATEGORIES = [
  'All Crypto',
  'DeFi & Web3',
  'Security & Audits',
  'Bitcoin & Ethereum',
  'Regulations & Policy',
  'Market Sentiment'
];

/**
 * Smart image component with Apple-grade frosted fallback
 */
function NewsImage({ src, alt, className, icon = "📰", sourceName = "Crypto News" }) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-center border-b border-white/10 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl mb-2 shadow-md backdrop-blur-md">
          {typeof icon === 'string' && icon.length < 5 ? icon : '⚡'}
        </div>
        <span className="caption-label text-slate-300">
          {sourceName}
        </span>
        <span className="text-[9px] text-[var(--apple-blue)] font-bold mt-0.5 tracking-wider uppercase">
          TrustChain Feed
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
}

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('live_api');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters & Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Crypto');
  const [selectedImpact, setSelectedImpact] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const loadNewsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetchCryptoNews();
      setNews(res.items);
      setDataSource(res.source);
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
  }, []);

  // Auto-refresh interval (every 60s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadNewsData();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Derived dashboard statistics
  const stats = useMemo(() => {
    if (!news.length) return { total: 0, highImpact: 0, sourcesCount: 0 };
    let highImpact = 0;
    const sources = new Set();

    news.forEach(item => {
      if (item.impact === 'high') highImpact++;
      if (item.source) sources.add(item.source);
    });

    return {
      total: news.length,
      highImpact,
      sourcesCount: sources.size || 5
    };
  }, [news]);

  // Filter and sort news items
  const filteredNews = useMemo(() => {
    return news
      .filter(item => {
        // Search query filter
        const matchSearch =
          searchQuery === '' ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.source.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter
        const matchCategory =
          selectedCategory === 'All Crypto' ||
          (item.categories && item.categories.includes(selectedCategory));

        // Impact filter
        const matchImpact =
          selectedImpact === 'all' || item.impact === selectedImpact;

        return matchSearch && matchCategory && matchImpact;
      })
      .sort((a, b) => {
        if (sortBy === 'impact') {
          const impactWeight = { high: 3, medium: 2, low: 1 };
          return (impactWeight[b.impact] || 0) - (impactWeight[a.impact] || 0);
        }
        // Default latest
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      });
  }, [news, searchQuery, selectedCategory, selectedImpact, sortBy]);

  const featuredStory = useMemo(() => {
    return news.find(n => n.impact === 'high') || news[0];
  }, [news]);

  const handleCopyShareLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return 'Just now';
    const now = new Date();
    const then = new Date(dateInput);
    const diffMin = Math.floor((now - then) / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 animate-apple-fade-in">
      
      {/* ── Apple News Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--apple-blue-tint)] border border-[var(--apple-blue-border)] text-[var(--apple-blue)] text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[var(--apple-blue)] animate-pulse" />
            <span>Apple News Intelligence Feed</span>
          </div>

          <h1 className="section-title text-[var(--text-primary)]">
            Live Crypto & Web3 Security News
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal max-w-2xl">
            Real-time verified cryptocurrency intelligence, exploit alerts, and risk telemetry aggregated across trusted Web3 outlets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadNewsData(true)}
            disabled={refreshing}
            className="px-4 py-2 rounded-full apple-glass text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--apple-blue-border)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer apple-press"
          >
            <svg className={`w-3.5 h-3.5 text-[var(--apple-blue)] ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Syncing...' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {/* ── Intelligence Dashboard Bar (Apple Health Style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Feed Stories */}
        <div className="apple-glass p-5 rounded-3xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--apple-blue-tint)] border border-[var(--apple-blue-border)] flex items-center justify-center text-[var(--apple-blue)] font-bold text-base">
            📰
          </div>
          <div>
            <div className="caption-label text-[var(--text-muted)]">Total Articles</div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{stats.total} Stories</div>
          </div>
        </div>

        {/* High Impact Updates */}
        <div className="apple-glass p-5 rounded-3xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--apple-amber-tint)] border border-[var(--apple-amber-border)] flex items-center justify-center text-[var(--apple-amber)] font-bold text-base">
            ⚡
          </div>
          <div>
            <div className="caption-label text-[var(--text-muted)]">High Impact Alerts</div>
            <div className="text-xl font-bold text-[var(--apple-amber)]">{stats.highImpact} Stories</div>
          </div>
        </div>

        {/* Active Outlets */}
        <div className="apple-glass p-5 rounded-3xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--apple-green-tint)] border border-[var(--apple-green-border)] flex items-center justify-center text-[var(--apple-green)] font-bold text-base">
            ✓
          </div>
          <div>
            <div className="caption-label text-[var(--text-muted)]">Verified Outlets</div>
            <div className="text-xl font-bold text-[var(--apple-green)]">{stats.sourcesCount} Outlets</div>
          </div>
        </div>
      </div>

      {/* ── Featured Story Hero (Apple App Store "Today" Card Style) ── */}
      {!loading && featuredStory && searchQuery === '' && selectedCategory === 'All Crypto' && selectedImpact === 'all' && (
        <div className="relative rounded-3xl overflow-hidden apple-glass hover-lift border border-[var(--apple-blue-border)] group shadow-xl">
          <div className="grid md:grid-cols-12 gap-0">
            {/* Image Banner */}
            <div className="md:col-span-7 h-64 md:h-96 relative overflow-hidden bg-slate-900">
              <NewsImage
                src={featuredStory.image}
                alt={featuredStory.title}
                icon={featuredStory.sourceIcon}
                sourceName={featuredStory.source}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent" />
              
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--apple-red)] text-white uppercase tracking-wider shadow-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Breaking Story
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                  <span className="text-[var(--text-primary)] font-semibold">{featuredStory.source}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(featuredStory.publishedAt)}</span>
                </div>

                <h2 className="headline text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--apple-blue)] transition-colors leading-snug">
                  {featuredStory.title}
                </h2>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed font-normal">
                  {featuredStory.body}
                </p>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {featuredStory.categories.map(cat => (
                    <span key={cat} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--apple-blue-tint)] text-[var(--apple-blue)] border border-[var(--apple-blue-border)]">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-color)] mt-6">
                <a
                  href={featuredStory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer apple-press"
                >
                  <span>Read Full Article on {featuredStory.source}</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Segmented Filter Bar ── */}
      <div className="apple-glass p-5 rounded-3xl space-y-4">
        {/* Search + Priority Selectors */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Spotlight Search */}
          <div className="relative flex-1 w-full">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search crypto news (e.g. BTC, ETH, Hack, SEC, Layer 2)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-full apple-inset text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--apple-blue-border)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Select Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedImpact}
              onChange={e => setSelectedImpact(e.target.value)}
              className="px-3.5 py-2.5 rounded-full apple-inset text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] cursor-pointer w-full md:w-auto"
            >
              <option value="all">All Priority Levels</option>
              <option value="high">High Impact Only 🔥</option>
              <option value="medium">Standard News 📰</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 rounded-full apple-inset text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--apple-blue-border)] cursor-pointer w-full md:w-auto"
            >
              <option value="latest">Sort: Latest First</option>
              <option value="impact">Sort: Highest Impact</option>
            </select>
          </div>
        </div>

        {/* Segmented Category Pills */}
        <div className="apple-segmented overflow-x-auto p-1">
          {CATEGORIES.map(category => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`apple-segmented-item ${isActive ? 'active' : ''}`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="apple-glass rounded-3xl p-5 space-y-4 animate-pulse">
              <div className="h-44 bg-[var(--border-color)] rounded-2xl" />
              <div className="h-4 bg-[var(--border-color)] rounded-full w-3/4" />
              <div className="h-3 bg-[var(--border-color)] rounded-full w-full" />
              <div className="h-3 bg-[var(--border-color)] rounded-full w-5/6" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && filteredNews.length === 0 && (
        <div className="apple-glass rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[var(--apple-blue-tint)] flex items-center justify-center text-2xl mx-auto text-[var(--apple-blue)]">
            🔍
          </div>
          <h3 className="headline text-[var(--text-primary)]">
            No News Articles Found
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto font-normal">
            We couldn't find any articles matching your search query or filter criteria. Try resetting your search terms.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Crypto');
              setSelectedImpact('all');
            }}
            className="px-5 py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-semibold text-xs shadow-md transition-all cursor-pointer apple-press"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* ── Article Cards Grid ── */}
      {!loading && filteredNews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map(item => (
            <article
              key={item.id}
              className="apple-glass rounded-3xl overflow-hidden hover-lift flex flex-col justify-between group"
            >
              <div>
                {/* Article Image Container */}
                <div className="h-48 relative overflow-hidden bg-slate-900">
                  <NewsImage
                    src={item.image}
                    alt={item.title}
                    icon={item.sourceIcon}
                    sourceName={item.source}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    {item.impact === 'high' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--apple-amber)] text-white uppercase tracking-wider shadow-md">
                        🔥 High Impact
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white uppercase tracking-wider shadow-md backdrop-blur-md border border-white/10">
                        📰 Update
                      </span>
                    )}
                  </div>

                  {/* Source + Time Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 font-medium">
                    <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 text-[11px]">
                      <span>{item.source}</span>
                    </div>
                    <span className="bg-slate-950/60 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 text-[11px]">
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-2.5">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1">
                    {item.categories.map(cat => (
                      <span key={cat} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--apple-blue-tint)] text-[var(--apple-blue)] border border-[var(--apple-blue-border)]">
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Article Title */}
                  <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--apple-blue)] transition-colors line-clamp-2 leading-snug">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h3>

                  {/* Article Excerpt */}
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed font-normal">
                    {item.body}
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-inset)] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyShareLink(item.id, item.url)}
                  className="text-[var(--text-muted)] hover:text-[var(--apple-blue)] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer apple-press"
                  title="Copy link to article"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>{copiedId === item.id ? 'Copied' : 'Share'}</span>
                </button>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--apple-blue)] hover:underline flex items-center gap-1 cursor-pointer apple-press"
                >
                  <span>Read Article</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
