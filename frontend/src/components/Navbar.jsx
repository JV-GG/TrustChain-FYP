import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useTheme } from '../hooks/useTheme';

export default function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { disconnect } = useDisconnect();

  const [campaignsDropdown, setCampaignsDropdown] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletDropdownRef = useRef(null);
  const campaignsDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target)) {
        setWalletDropdownOpen(false);
      }
      if (campaignsDropdownRef.current && !campaignsDropdownRef.current.contains(event.target)) {
        setCampaignsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setCampaignsDropdown(false);
  }, [location.pathname]);

  const handleCopy = (addr) => {
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCampaignActive = location.pathname.startsWith('/campaigns') || location.pathname === '/create';

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-header)] border-b border-[var(--border-color)] backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* ── Brand Logo ── */}
        <Link to="/" className="flex items-center group flex-shrink-0">
          <img
            src="/logo.png"
            alt="TrustChain Light"
            className="h-12 sm:h-14 w-auto object-contain group-hover:scale-105 transition-transform block dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="TrustChain Dark"
            className="h-12 sm:h-14 w-auto object-contain group-hover:scale-105 transition-transform hidden dark:block"
          />
        </Link>

        {/* ── Desktop Navigation Bar ── */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/5 dark:bg-slate-100/5 p-1.5 rounded-2xl border border-[var(--border-color)] shadow-inner">
          {/* Home */}
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              location.pathname === '/'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>

          {/* Crypto News */}
          <Link
            to="/news"
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 relative ${
              location.pathname === '/news'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>📰</span>
            <span>Crypto News</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </Link>

          {/* Check Wallet */}
          <Link
            to="/check"
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              location.pathname === '/check'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>🛡️</span>
            <span>Check Wallet</span>
          </Link>

          {/* Campaigns Dropdown */}
          <div className="relative" ref={campaignsDropdownRef}>
            <button
              onClick={() => setCampaignsDropdown(!campaignsDropdown)}
              type="button"
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                isCampaignActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <span>🚀</span>
              <span>Campaigns</span>
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${campaignsDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sub-menu Dropdown */}
            {campaignsDropdown && (
              <div className="absolute left-0 top-full mt-2 w-56 theme-card-solid rounded-2xl shadow-2xl p-2 space-y-1 z-50 animate-fade-in border border-[var(--border-color)]">
                <Link
                  to="/campaigns"
                  onClick={() => setCampaignsDropdown(false)}
                  className={`w-full p-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2.5 transition-all ${
                    location.pathname === '/campaigns'
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <span>📋</span>
                  <span>Browse Campaigns</span>
                </Link>

                <Link
                  to="/create"
                  onClick={() => setCampaignsDropdown(false)}
                  className={`w-full p-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2.5 transition-all ${
                    location.pathname === '/create'
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <span>➕</span>
                  <span>Create Campaign</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* ── Right Actions: Network + Theme Toggle + Connect Wallet ── */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all text-xs font-semibold flex items-center justify-center cursor-pointer shadow-sm text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <span className="text-amber-400">☀️</span> : <span className="text-indigo-700">🌙</span>}
          </button>

          {/* Connect Button */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer btn-vibe"
                        >
                          <span>👛</span>
                          <span>Connect Wallet</span>
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 font-extrabold text-xs flex items-center justify-center cursor-pointer"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="relative" ref={walletDropdownRef}>
                        <button
                          onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                          type="button"
                          className="px-3.5 py-2 rounded-xl theme-card flex items-center gap-2.5 font-extrabold text-xs cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm"
                        >
                          <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                            🌐
                          </div>
                          <span className="font-mono text-[var(--text-primary)]">{account.displayName}</span>
                          <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${walletDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Wallet Dropdown Menu */}
                        {walletDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-64 theme-card-solid rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-fade-in border border-[var(--border-color)]">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg flex-shrink-0">
                                👛
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-[var(--text-primary)] font-mono truncate">
                                  {account.address}
                                </p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                                  {account.displayBalance ? `${account.displayBalance}` : 'Sepolia ETH'}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Link
                                to="/campaigns?filter=MY_CAMPAIGNS"
                                onClick={() => setWalletDropdownOpen(false)}
                                className="w-full p-2.5 rounded-xl hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <span>📁</span>
                                <span>My Campaigns</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleCopy(account.address)}
                                className="w-full p-2.5 rounded-xl hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                              >
                                <span>{copied ? '✅' : '📋'}</span>
                                <span>{copied ? 'Address Copied!' : 'Copy Address'}</span>
                              </button>

                              <a
                                href={`https://sepolia.etherscan.io/address/${account.address}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setWalletDropdownOpen(false)}
                                className="w-full p-2.5 rounded-xl hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <span>🔍</span>
                                <span>View on Etherscan</span>
                              </a>
                            </div>

                            <div className="pt-2 border-t border-[var(--border-color)]">
                              <button
                                type="button"
                                onClick={() => {
                                  setWalletDropdownOpen(false);
                                  disconnect();
                                }}
                                className="w-full p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                              >
                                <span>🚪</span>
                                <span>Disconnect Wallet</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>

          {/* Mobile Hamburger Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-[var(--border-color)] text-[var(--text-primary)] md:hidden cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-2 animate-fade-in">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>

          <Link
            to="/news"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            <span>📰</span>
            <span>Crypto News</span>
          </Link>

          <Link
            to="/check"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            <span>🛡️</span>
            <span>Check Wallet</span>
          </Link>

          <Link
            to="/campaigns"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            <span>📋</span>
            <span>Browse Campaigns</span>
          </Link>

          <Link
            to="/create"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            <span>➕</span>
            <span>Create Campaign</span>
          </Link>
        </div>
      )}
    </header>
  );
}
