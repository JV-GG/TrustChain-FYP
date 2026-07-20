import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useTheme } from '../hooks/useTheme';

export default function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { disconnect } = useDisconnect();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Check Wallet', path: '/check' },
    { name: 'Campaigns', path: '/campaigns' },
    { name: 'Create Campaign', path: '/create' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (addr) => {
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-50 theme-header transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center group py-1">
          <img
            src="/logo.png"
            alt="TrustChain Light"
            className="h-16 sm:h-20 md:h-22 w-auto object-contain group-hover:scale-105 transition-transform block dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="TrustChain Dark"
            className="h-16 sm:h-20 md:h-22 w-auto object-contain group-hover:scale-105 transition-transform hidden dark:block"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 theme-inset p-1.5 rounded-full">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-1.5 rounded-full text-sm font-extrabold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Connect Button + Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all text-sm font-semibold flex items-center justify-center cursor-pointer shadow-sm"
          >
            {theme === 'dark' ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-indigo-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </span>
            )}
          </button>

          {/* Custom Wallet Button with Header Anchored Dropdown Menu */}
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
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 font-extrabold text-xs cursor-pointer"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          type="button"
                          className="px-3.5 py-2 rounded-xl theme-card flex items-center gap-2.5 font-extrabold text-xs cursor-pointer hover:border-indigo-500/50 transition-all shadow-sm"
                        >
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white">
                            🌐
                          </div>
                          <span className="font-mono text-[var(--text-primary)]">{account.displayName}</span>
                          <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-64 theme-card-solid rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-fade-in border border-[var(--border-color)]">
                            {/* Wallet Info Header */}
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md flex-shrink-0">
                                <div className="w-full h-full theme-card-solid rounded-[10px] flex items-center justify-center text-base">
                                  👛
                                </div>
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

                            {/* Actions List */}
                            <div className="space-y-1">
                              <Link
                                to="/campaigns?filter=MY_CAMPAIGNS"
                                onClick={() => setDropdownOpen(false)}
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
                                onClick={() => setDropdownOpen(false)}
                                className="w-full p-2.5 rounded-xl hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <span>🔍</span>
                                <span>View on Etherscan</span>
                              </a>

                              <Link
                                to={`/audit/${account.address}`}
                                onClick={() => setDropdownOpen(false)}
                                className="w-full p-2.5 rounded-xl hover:bg-[var(--border-subtle)]/30 text-xs font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <span>📊</span>
                                <span>My Audit Dashboard</span>
                              </Link>
                            </div>

                            {/* Disconnect Action */}
                            <div className="pt-2 border-t border-[var(--border-color)]">
                              <button
                                type="button"
                                onClick={() => {
                                  setDropdownOpen(false);
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
        </div>
      </div>
    </header>
  );
}
