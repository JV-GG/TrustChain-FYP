import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useTheme } from '../hooks/useTheme';

export default function SidebarLayout({ children }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { disconnect } = useDisconnect();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

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

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleCopy = (addr) => {
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navGroups = [
    {
      title: 'PLATFORM',
      items: [
        {
          name: 'Home',
          path: '/',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Crypto News',
          path: '/news',
          badge: 'LIVE',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'RISK & AUDITS',
      items: [
        {
          name: 'Check Wallet',
          path: '/check',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'CROWDFUNDING',
      items: [
        {
          name: 'Campaigns',
          path: '/campaigns',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
        {
          name: 'Create Campaign',
          path: '/create',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const getPageTitle = (pathname) => {
    if (pathname === '/') return 'Dashboard Overview';
    if (pathname === '/news') return 'Crypto News Feed';
    if (pathname === '/check') return 'Risk Engine & Wallet Audit';
    if (pathname === '/campaigns') return 'Verified Campaigns';
    if (pathname === '/create') return 'Launch On-Chain Campaign';
    if (pathname.startsWith('/audit')) return 'Audit Intelligence Report';
    return 'TrustChain Protocol';
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      {/* ── Mobile Overlay Backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* ── Adaptive Left Sidebar ── */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen transition-all duration-300 flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-color)] backdrop-blur-xl ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Sidebar Header & Brand Logo */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-[var(--border-color)]">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-md shadow-indigo-600/30">
              T
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-[var(--text-primary)]">
                  Trust<span className="text-indigo-600 dark:text-indigo-400">Chain</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest">
                  Risk & Escrow
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-[var(--bg-inset)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-none">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : ''}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all group ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
                    }`}
                  >
                    <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-indigo-500/80 dark:text-indigo-400/80'}`}>
                      {item.icon}
                    </span>

                    {!collapsed && <span className="truncate flex-1">{item.name}</span>}

                    {!collapsed && item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-2">
          {/* Network Indicator */}
          {!collapsed && (
            <div className="px-3 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] flex items-center justify-between text-xs">
              <span className="text-[11px] font-extrabold text-[var(--text-muted)]">Network</span>
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sepolia
              </span>
            </div>
          )}

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className="w-full p-2.5 rounded-xl bg-[var(--bg-inset)] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[var(--border-color)] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer text-[var(--text-primary)]"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <span className="text-amber-400">☀️</span>
                {!collapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <span className="text-indigo-600">🌙</span>
                {!collapsed && <span>Dark Mode</span>}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-20 px-4 sm:px-8 bg-[var(--bg-header)] backdrop-blur-xl border-b border-[var(--border-color)] flex items-center justify-between">
          {/* Mobile Sidebar Trigger & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] md:hidden cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-muted)]">
                <span>TrustChain</span>
                <span>/</span>
                <span className="text-indigo-600 dark:text-indigo-400">{getPageTitle(location.pathname)}</span>
              </div>
            </div>
          </div>

          {/* Top Actions & Wallet Connect Button */}
          <div className="flex items-center gap-3">
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
                        <div className="relative" ref={dropdownRef}>
                          <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            type="button"
                            className="px-3.5 py-2 rounded-xl theme-card flex items-center gap-2.5 font-extrabold text-xs cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm"
                          >
                            <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold">
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
                              </div>

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
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Sleek Footer */}
        <footer className="border-t border-[var(--border-color)] py-6 text-center text-xs text-[var(--text-muted)] transition-colors">
          TrustChain © {new Date().getFullYear()} — Autonomous Blockchain Risk Verification & Transparent Crowdfunding
        </footer>
      </div>
    </div>
  );
}
