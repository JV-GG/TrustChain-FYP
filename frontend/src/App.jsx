import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CheckWallet from './pages/CheckWallet';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import AuditDashboard from './pages/AuditDashboard';
import News from './pages/News';

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-300 relative selection:bg-[var(--apple-blue-tint)] selection:text-[var(--apple-blue)]">
        
        {/* Subtle Apple Ambient Glow in Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-blue-500/5 via-emerald-500/5 to-transparent blur-[120px] rounded-full dark:from-blue-500/10 dark:via-emerald-500/10" />
        </div>

        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/check" element={<CheckWallet />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/audit/:identifier" element={<AuditDashboard />} />
            <Route path="/audit/campaign/:campaignId" element={<AuditDashboard />} />
          </Routes>
        </main>

        <footer className="border-t border-[var(--border-color)] py-8 px-4 sm:px-8 text-center transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--apple-green)]" />
              <span>Ethereum Sepolia Testnet Active</span>
            </div>
            <div>
              TrustChain © {new Date().getFullYear()} — Autonomous Blockchain Risk Verification & Escrow Vaults
            </div>
            <div className="flex items-center gap-4 text-[var(--text-secondary)]">
              <a href="https://github.com/JV-GG/TrustChain-FYP" target="_blank" rel="noreferrer" className="hover:text-[var(--text-primary)] transition-colors">
                Source Code
              </a>
              <span>•</span>
              <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer" className="hover:text-[var(--text-primary)] transition-colors">
                Sepolia Etherscan
              </a>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
