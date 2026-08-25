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
    <header className="sticky top-0 z-50 apple-glass-header border-b border-[var(--border-color)] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* ── Apple-Style Brand Mark ── */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 group flex-shrink-0 focus-visible:outline-none apple-press"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#1d1d1f] to-[#000000] dark:from-[#3a3a3c] dark:to-[#1c1c1e] text-white flex items-center justify-center font-bold text-xs shadow-sm border border-white/20 dark:border-white/10 group-hover:scale-105 transition-transform duration-200">
            <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] tracking-tight text-[var(--text-primary)]">
              Trust<span className="text-[var(--apple-green)] font-extrabold">Chain</span>
            </span>
            <span className="text-[8.5px] text-[var(--text-muted)] font-semibold tracking-wider uppercase hidden sm:inline-block">
              Risk & Escrow Vault
            </span>
          </div>
        </Link>

        {/* ── Apple Segmented Nav Pill (Desktop) ── */}
        <nav className="hidden md:flex items-center apple-segmented">
          {/* Home */}
          <Link
            to="/"
            className={`apple-segmented-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            <span>Home</span>
          </Link>

          {/* Crypto News */}
          <Link
            to="/news"
            className={`apple-segmented-item flex items-center gap-1.5 ${location.pathname === '/news' ? 'active' : ''}`}
          >
            <span>News</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-green)] animate-pulse" />
          </Link>

          {/* Risk Engine */}
          <Link
            to="/check"
            className={`apple-segmented-item ${location.pathname === '/check' ? 'active' : ''}`}
          >
            <span>Risk Engine</span>
          </Link>

          {/* Campaigns Dropdown */}
          <div className="relative" ref={campaignsDropdownRef}>
            <button
              onClick={() => setCampaignsDropdown(!campaignsDropdown)}
              type="button"
              className={`apple-segmented-item flex items-center gap-1 cursor-pointer ${
                isCampaignActive ? 'active' : ''
              }`}
            >
              <span>Campaigns</span>
              <svg 
                className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${campaignsDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sub-menu Dropdown */}
            {campaignsDropdown && (
              <div className="absolute left-0 top-full mt-2 w-48 apple-card-solid rounded-2xl shadow-xl p-1.5 space-y-0.5 z-50 animate-apple-fade-in border border-[var(--border-color)]">
                <Link
                  to="/campaigns"
                  onClick={() => setCampaignsDropdown(false)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all apple-press ${
                    location.pathname === '/campaigns'
                      ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Browse Campaigns</span>
                </Link>

                <Link
                  to="/create"
                  onClick={() => setCampaignsDropdown(false)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all apple-press ${
                    location.pathname === '/create'
                      ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Campaign</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* ── Right Actions: Theme Toggle + Connect Wallet ── */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--bg-segmented)] border border-[var(--border-color)] transition-all flex items-center justify-center cursor-pointer apple-press text-[var(--text-primary)]"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" />
                <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
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
                          className="px-4 py-2 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer apple-press"
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
                          className="px-3.5 py-1.5 rounded-full bg-[var(--apple-red-tint)] text-[var(--apple-red)] border border-[var(--apple-red-border)] font-semibold text-xs flex items-center justify-center cursor-pointer apple-press"
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
                          className="px-3.5 py-1.5 rounded-full apple-glass flex items-center gap-2 font-semibold text-xs cursor-pointer hover:border-[var(--apple-blue-border)] transition-all apple-press"
                        >
                          <div className="w-2 h-2 rounded-full bg-[var(--apple-green)] animate-pulse" />
                          <span className="font-mono text-[var(--text-primary)] text-[11px] font-medium">{account.displayName}</span>
                          <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${walletDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Wallet Dropdown Menu */}
                        {walletDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-64 apple-card-solid rounded-2xl shadow-2xl p-3.5 space-y-3 z-50 animate-apple-fade-in border border-[var(--border-color)]">
                            <div className="border-b border-[var(--border-color)] pb-3">
                              <p className="caption-label text-[var(--text-muted)]">Connected Wallet</p>
                              <p className="text-xs font-semibold text-[var(--text-primary)] font-mono truncate mt-1">
                                {account.address}
                              </p>
                              <p className="text-[12px] text-[var(--apple-green)] font-bold mt-1">
                                {account.displayBalance ? `${account.displayBalance}` : 'Sepolia ETH'}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <Link
                                to="/campaigns?filter=MY_CAMPAIGNS"
                                onClick={() => setWalletDropdownOpen(false)}
                                className="w-full px-3 py-2 rounded-xl hover:bg-[var(--bg-inset)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer apple-press"
                              >
                                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <span>My Campaigns</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleCopy(account.address)}
                                className="w-full px-3 py-2 rounded-xl hover:bg-[var(--bg-inset)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer text-left apple-press"
                              >
                                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>{copied ? 'Address Copied!' : 'Copy Address'}</span>
                              </button>

                              <a
                                href={`https://sepolia.etherscan.io/address/${account.address}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setWalletDropdownOpen(false)}
                                className="w-full px-3 py-2 rounded-xl hover:bg-[var(--bg-inset)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer apple-press"
                              >
                                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
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
                                className="w-full py-2 rounded-xl bg-[var(--apple-red-tint)] hover:bg-[var(--apple-red)] hover:text-white text-[var(--apple-red)] text-xs font-semibold flex items-center justify-center transition-all cursor-pointer apple-press"
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
            className="w-9 h-9 rounded-full bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] md:hidden flex items-center justify-center cursor-pointer apple-press"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] apple-glass p-3 space-y-1 animate-apple-fade-in">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold ${location.pathname === '/' ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'}`}
          >
            Home
          </Link>

          <Link
            to="/news"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold ${location.pathname === '/news' ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'}`}
          >
            Crypto News
          </Link>

          <Link
            to="/check"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold ${location.pathname === '/check' ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'}`}
          >
            Risk Engine
          </Link>

          <Link
            to="/campaigns"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold ${location.pathname === '/campaigns' ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'}`}
          >
            Browse Campaigns
          </Link>

          <Link
            to="/create"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold ${location.pathname === '/create' ? 'bg-[var(--apple-green-tint)] text-[var(--apple-green)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'}`}
          >
            Create Campaign
          </Link>
        </div>
      )}
    </header>
  );
}
