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

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/check" element={<CheckWallet />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/audit/:address" element={<AuditDashboard />} />
          </Routes>
        </main>
        <footer className="border-t border-[var(--border-color)] py-6 text-center text-xs text-[var(--text-muted)] transition-colors">
          TrustChain © {new Date().getFullYear()} — Autonomous Blockchain Risk Verification & Transparent Crowdfunding
        </footer>
      </div>
    </ThemeProvider>
  );
}
