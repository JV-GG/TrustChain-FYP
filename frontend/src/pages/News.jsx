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
 * Smart image component with graceful Web3 gradient fallback
 */
function NewsImage({ src, alt, className, icon = "📰", sourceName = "Crypto News" }) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-emerald-950 p-6 text-center border-b border-white/10 ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-3xl mb-2 shadow-xl backdrop-blur-md">
          {typeof icon === 'string' && icon.length < 5 ? icon : '⚡'}
        </div>
        <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
          {sourceName}
        </span>
        <span className="text-[10px] text-indigo-400/80 font-extrabold mt-0.5 uppercase tracking-widest">
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
      sourcesCount: sources.size
    };
  }, [news]);

  // Filtered & sorted articles
  const filteredNews = useMemo(() => {
    return news.filter(item => {
      // Category filter
      if (selectedCategory !== 'All Crypto' && !item.categories.includes(selectedCategory)) {
        return false;
      }
      // Impact filter
      if (selectedImpact !== 'all' && item.impact !== selectedImpact) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(query);
        const inBody = item.body.toLowerCase().includes(query);
        const inSource = item.source.toLowerCase().includes(query);
        const inTags = item.tags && item.tags.some(t => t.toLowerCase().includes(query));
        return inTitle || inBody || inSource || inTags;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'impact') {
        if (a.impact === 'high' && b.impact !== 'high') return -1;
        if (b.impact === 'high' && a.impact !== 'high') return 1;
      }
      return b.publishedAt - a.publishedAt;
    });
  }, [news, selectedCategory, selectedImpact, searchQuery, sortBy]);

  // Top featured story for Hero component
  const featuredStory = useMemo(() => {
    if (!news.length) return null;
    return news.find(item => item.impact === 'high') || news[0];
  }, [news]);

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleCopyShareLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* ── Page Header & Title Banner ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold tracking-wider uppercase mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Real-Time Intelligence Feed
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Crypto Market News
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl font-medium">
            Aggregated breaking news, security risk alerts, and regulatory updates tailored for Web3 project owners, backers & protocol auditors.
          </p>
        </div>

        {/* Live Refresh & Source Badge */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-muted)] border-[var(--border-color)]'
            }`}
            title="Toggle 60s auto-refresh"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {autoRefresh ? 'Auto-Live ON' : 'Auto-Live OFF'}
          </button>

          <button
            onClick={() => loadNewsData(true)}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {/* ── Intelligence Dashboard Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Feed Stories */}
        <div className="theme-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 text-xl font-bold">
            📰
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)] font-extrabold uppercase">Total Articles</div>
            <div className="text-xl font-black text-[var(--text-primary)]">{stats.total}</div>
          </div>
        </div>

        {/* High Impact Updates */}
        <div className="theme-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xl font-bold">
            🔥
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)] font-extrabold uppercase">High Impact Updates</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.highImpact} Stories</div>
          </div>
        </div>

        {/* Active Outlets */}
        <div className="theme-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-xl font-bold">
            📡
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)] font-extrabold uppercase">Verified Outlets</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.sourcesCount} Outlets</div>
          </div>
        </div>
      </div>

      {/* ── Featured Story Hero ── */}
      {!loading && featuredStory && searchQuery === '' && selectedCategory === 'All Crypto' && selectedImpact === 'all' && (
        <div className="relative rounded-3xl overflow-hidden theme-card hover-lift border border-indigo-500/30 group shadow-xl">
          <div className="grid md:grid-cols-12 gap-0">
            {/* Image Banner */}
            <div className="md:col-span-7 h-64 md:h-96 relative overflow-hidden bg-slate-900">
              <NewsImage
                src={featuredStory.image}
                alt={featuredStory.title}
                icon={featuredStory.sourceIcon}
                sourceName={featuredStory.source}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 dark:brightness-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent" />
              
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  High Impact Breaking Story
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-inset)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-muted)]">
                    {typeof featuredStory.sourceIcon === 'string' && featuredStory.sourceIcon.startsWith('http') ? (
                      <img src={featuredStory.sourceIcon} alt={featuredStory.source} className="w-4 h-4 rounded-full" />
                    ) : (
                      <span>{featuredStory.sourceIcon}</span>
                    )}
                    <span className="text-[var(--text-primary)]">{featuredStory.source}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(featuredStory.publishedAt)}</span>
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                  {featuredStory.title}
                </h2>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                  {featuredStory.body}
                </p>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {featuredStory.categories.map(cat => (
                    <span key={cat} className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-color)] flex items-center justify-between mt-6">
                <a
                  href={featuredStory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer btn-vibe"
                >
                  <span>Read Full Article on {featuredStory.source}</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filters Toolbar ── */}
      <div className="theme-card p-4 rounded-2xl space-y-4">
        {/* Search + Primary Selectors */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search crypto news (e.g. BTC, ETH, Hack, SEC, Layer 2)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Impact Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedImpact}
              onChange={e => setSelectedImpact(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs font-extrabold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 cursor-pointer w-full md:w-auto"
            >
              <option value="all">All Priority Levels</option>
              <option value="high">High Impact Only 🔥</option>
              <option value="medium">Standard News 📰</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs font-extrabold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 cursor-pointer w-full md:w-auto"
            >
              <option value="latest">Sort: Latest First</option>
              <option value="impact">Sort: Highest Impact</option>
            </select>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(category => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                    : 'bg-[var(--bg-inset)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
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
            <div key={i} className="theme-card rounded-2xl p-4 space-y-4 animate-pulse">
              <div className="h-44 bg-slate-300 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-300 dark:bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-300 dark:bg-slate-800 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && filteredNews.length === 0 && (
        <div className="theme-card rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl mx-auto text-indigo-500">
            🔍
          </div>
          <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
            No News Articles Found
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            We couldn't find any articles matching your search query or filter criteria. Try resetting your search terms.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Crypto');
              setSelectedImpact('all');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
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
              className="theme-card rounded-2xl overflow-hidden hover-lift flex flex-col justify-between group border border-[var(--border-color)]"
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
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-md">
                        🔥 High Impact
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800/90 text-white uppercase tracking-wider shadow-md backdrop-blur-md">
                        📰 Update
                      </span>
                    )}
                  </div>

                  {/* Source + Time Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 font-extrabold">
                    <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
                      <span>{item.source}</span>
                    </div>
                    <span className="bg-slate-950/60 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 text-[11px]">
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1">
                    {item.categories.map(cat => (
                      <span key={cat} className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Article Title */}
                  <h3 className="text-base font-black text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h3>

                  {/* Article Excerpt */}
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-inset)] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyShareLink(item.id, item.url)}
                  className="text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy link to article"
                >
                  <span>{copiedId === item.id ? '✅ Copied' : '🔗 Share'}</span>
                </button>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Read Article</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
