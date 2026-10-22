import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CheckWallet from './pages/CheckWallet';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import AuditDashboard from './pages/AuditDashboard';
import News from './pages/News';
import { CONTRACT_ADDRESS } from './config/contract';
import { shortAddr } from './lib/format';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
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

      <footer className="border-t border-[var(--rule)]">
        <div className="page py-7 flex flex-wrap justify-between gap-x-6 gap-y-3 text-[13px] text-[var(--ink-3)]">
          <span className="flex items-center gap-2">
            <span className="dot" />
            Sepolia testnet · Contract <span className="mono">{shortAddr(CONTRACT_ADDRESS, 8, 5)}</span>
          </span>
          <span className="flex gap-5">
            <a href="https://github.com/JV-GG/TrustChain-FYP" target="_blank" rel="noreferrer" className="text-[var(--ink-2)] hover:text-[var(--ink)]">
              Source code
            </a>
            <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="text-[var(--ink-2)] hover:text-[var(--ink)]">
              Etherscan
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
