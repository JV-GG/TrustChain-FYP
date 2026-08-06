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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* ── Brand Logo ── */}
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0 focus-visible:outline-none">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-emerald-500/20 border border-slate-700/50 dark:border-emerald-500/40 flex items-center justify-center text-white dark:text-emerald-400 font-extrabold text-sm shadow-sm group-hover:scale-105 transition-transform">
            TC
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
              Trust<span className="text-emerald-600 dark:text-emerald-400">Chain</span>
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest hidden sm:inline-block">
              Risk & Escrow
            </span>
          </div>
        </Link>

        {/* ── Desktop Navigation Bar ── */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-inset)] p-1 rounded-xl border border-[var(--border-color)]">
          {/* Home */}
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              location.pathname === '/'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>Home</span>
          </Link>

          {/* Crypto News */}
          <Link
            to="/news"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              location.pathname === '/news'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>News</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </Link>

          {/* Check Wallet */}
          <Link
            to="/check"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              location.pathname === '/check'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>Risk Engine</span>
          </Link>

          {/* Campaigns Dropdown */}
          <div className="relative" ref={campaignsDropdownRef}>
            <button
              onClick={() => setCampaignsDropdown(!campaignsDropdown)}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                isCampaignActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <span>Campaigns</span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${campaignsDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sub-menu Dropdown */}
            {campaignsDropdown && (
              <div className="absolute left-0 top-full mt-2 w-48 theme-card-solid rounded-xl shadow-xl p-1.5 space-y-1 z-50 animate-fade-in border border-[var(--border-color)]">
                <Link
                  to="/campaigns"
                  onClick={() => setCampaignsDropdown(false)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
                    location.pathname === '/campaigns'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <span>Browse Campaigns</span>
                </Link>

                <Link
                  to="/create"
                  onClick={() => setCampaignsDropdown(false)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
                    location.pathname === '/create'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <span>Create Campaign</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* ── Right Actions: Theme Toggle + Connect Wallet ── */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--border-subtle)]/40 border border-[var(--border-color)] transition-all text-xs font-extrabold flex items-center justify-center cursor-pointer text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <span className="text-amber-400">☀️</span> : <span className="text-slate-700">🌙</span>}
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
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer btn-vibe"
                        >
                          <span>Connect Wallet</span>
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 font-extrabold text-xs flex items-center justify-center cursor-pointer"
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
                          className="px-3 py-1.5 rounded-xl theme-card flex items-center gap-2 font-extrabold text-xs cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-mono text-[var(--text-primary)]">{account.displayName}</span>
                          <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${walletDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Wallet Dropdown Menu */}
                        {walletDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-60 theme-card-solid rounded-xl shadow-xl p-3 space-y-2.5 z-50 animate-fade-in border border-[var(--border-color)]">
                            <div className="border-b border-[var(--border-color)] pb-2.5">
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-extrabold">Connected Wallet</p>
                              <p className="text-xs font-extrabold text-[var(--text-primary)] font-mono truncate mt-0.5">
                                {account.address}
                              </p>
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                                {account.displayBalance ? `${account.displayBalance}` : 'Sepolia ETH'}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <Link
                                to="/campaigns?filter=MY_CAMPAIGNS"
                                onClick={() => setWalletDropdownOpen(false)}
                                className="w-full px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <span>My Campaigns</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleCopy(account.address)}
                                className="w-full px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors cursor-pointer text-left"
                              >
                                <span>{copied ? 'Address Copied!' : 'Copy Address'}</span>
                              </button>

                              <a
                                href={`https://sepolia.etherscan.io/address/${account.address}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setWalletDropdownOpen(false)}
                                className="w-full px-3 py-2 rounded-lg hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors cursor-pointer"
                              >
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
                                className="w-full py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer"
                              >
                                Disconnect Wallet
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
            className="p-2 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] md:hidden cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-card)] p-3 space-y-1 animate-fade-in">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block p-2.5 rounded-lg text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            Home
          </Link>

          <Link
            to="/news"
            onClick={() => setMobileMenuOpen(false)}
            className="block p-2.5 rounded-lg text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            Crypto News
          </Link>

          <Link
            to="/check"
            onClick={() => setMobileMenuOpen(false)}
            className="block p-2.5 rounded-lg text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            Risk Engine
          </Link>

          <Link
            to="/campaigns"
            onClick={() => setMobileMenuOpen(false)}
            className="block p-2.5 rounded-lg text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            Browse Campaigns
          </Link>

          <Link
            to="/create"
            onClick={() => setMobileMenuOpen(false)}
            className="block p-2.5 rounded-lg text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
          >
            Create Campaign
          </Link>
        </div>
      )}
    </header>
  );
}

