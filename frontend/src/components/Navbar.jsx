import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useTheme } from '../hooks/useTheme';

const NAV = [
  { to: '/', label: 'Home', match: (p) => p === '/' },
  { to: '/campaigns', label: 'Campaigns', match: (p) => p.startsWith('/campaigns') || p === '/create' || p.startsWith('/audit') },
  { to: '/check', label: 'Risk engine', match: (p) => p === '/check' },
  { to: '/news', label: 'News', match: (p) => p === '/news' },
];

function BrandMark() {
  return (
    <span className="w-8 h-8 rounded-lg bg-[var(--btn)] flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--btn-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { disconnect } = useDisconnect();

  const [walletOpen, setWalletOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (walletRef.current && !walletRef.current.contains(event.target)) {
        setWalletOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setWalletOpen(false);
  }, [location.pathname]);

  const handleCopy = (addr) => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navLinkClass = (active) =>
    `px-3.5 py-3 rounded-lg text-sm no-underline transition-colors ${
      active ? 'font-semibold text-[var(--ink)] bg-[var(--chip)]' : 'font-medium text-[var(--ink-2)] hover:text-[var(--ink)]'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rule)] bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="page py-3 flex items-center gap-x-4 sm:gap-x-8 gap-y-3">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-[var(--ink)] min-h-11">
          <BrandMark />
          <span className="font-bold text-[17px] tracking-[-0.02em]">TrustChain</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex gap-0.5 flex-1">
          {NAV.map((item) => {
            const active = item.match(location.pathname);
            return (
              <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={navLinkClass(active)}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[var(--rule)] rounded-full text-xs text-[var(--ink-2)]">
            <span className="dot" />
            Sepolia
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            className="icon-btn hidden sm:inline-flex"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.4 15.4A9 9 0 0 1 8.6 3.6 9 9 0 1 0 20.4 15.4z" />
              </svg>
            )}
          </button>

          <ConnectButton.Custom>
            {({ account, chain, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                  })}
                >
                  {!connected ? (
                    <button type="button" onClick={openConnectModal} className="btn btn-primary">
                      <span className="sm:hidden">Connect</span>
                      <span className="hidden sm:inline">Connect wallet</span>
                    </button>
                  ) : chain.unsupported ? (
                    <button type="button" onClick={openChainModal} className="btn btn-danger">
                      Wrong network
                    </button>
                  ) : (
                    <div className="relative" ref={walletRef}>
                      <button
                        type="button"
                        onClick={() => setWalletOpen((v) => !v)}
                        aria-expanded={walletOpen}
                        aria-haspopup="menu"
                        className="btn btn-secondary mono font-medium text-[13px] px-3.5"
                      >
                        <span className="w-[18px] h-[18px] rounded-full bg-[var(--accent)]" aria-hidden="true" />
                        {account.displayName}
                      </button>

                      {walletOpen && (
                        <div role="menu" className="absolute right-0 top-full mt-2 w-72 card-raised p-2 z-50" style={{ boxShadow: 'var(--shadow-pop)' }}>
                          <div className="px-3 py-3 border-b border-[var(--rule-soft)] mb-1">
                            <p className="text-xs text-[var(--ink-3)] m-0">Connected wallet</p>
                            <p className="mono text-[13px] text-[var(--ink)] break-all mt-1 mb-0">{account.address}</p>
                            {account.displayBalance && (
                              <p className="text-sm font-semibold text-[var(--accent)] mt-1.5 mb-0">{account.displayBalance}</p>
                            )}
                          </div>
                          <Link role="menuitem" to="/campaigns?filter=MY_CAMPAIGNS" className="flex items-center min-h-11 px-3 rounded-lg text-sm font-medium text-[var(--ink)] no-underline hover:bg-[var(--surface-2)]">
                            My campaigns
                          </Link>
                          <Link role="menuitem" to={`/check?address=${account.address}`} className="flex items-center min-h-11 px-3 rounded-lg text-sm font-medium text-[var(--ink)] no-underline hover:bg-[var(--surface-2)]">
                            Check my wallet
                          </Link>
                          <button role="menuitem" type="button" onClick={() => handleCopy(account.address)} className="w-full text-left flex items-center min-h-11 px-3 rounded-lg text-sm font-medium text-[var(--ink)] bg-transparent border-0 cursor-pointer hover:bg-[var(--surface-2)] font-[inherit]">
                            {copied ? 'Address copied' : 'Copy address'}
                          </button>
                          <a role="menuitem" href={`https://sepolia.etherscan.io/address/${account.address}`} target="_blank" rel="noreferrer" className="flex items-center min-h-11 px-3 rounded-lg text-sm font-medium text-[var(--ink)] no-underline hover:bg-[var(--surface-2)]">
                            View on Etherscan ↗
                          </a>
                          <div className="border-t border-[var(--rule-soft)] mt-1 pt-1">
                            <button
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                setWalletOpen(false);
                                disconnect();
                              }}
                              className="w-full text-left flex items-center min-h-11 px-3 rounded-lg text-sm font-semibold text-[var(--red)] bg-transparent border-0 cursor-pointer hover:bg-[var(--red-tint)] font-[inherit]"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="icon-btn md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d={mobileOpen ? 'M6 18 18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="md:hidden border-t border-[var(--rule)] bg-[var(--bg)]">
          <div className="page py-2 flex flex-col">
            {[...NAV, { to: '/create', label: 'Launch a campaign', match: (p) => p === '/create' }].map((item) => {
              const active = item.match(location.pathname) && !(item.to === '/campaigns' && location.pathname === '/create');
              return (
                <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={`${navLinkClass(active)} min-h-11`}>
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={toggleTheme}
              className={`${navLinkClass(false)} min-h-11 text-left bg-transparent cursor-pointer font-[inherit] border-t border-[var(--rule-soft)] rounded-none mt-1`}
            >
              {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
