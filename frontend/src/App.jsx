import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CheckWallet from './pages/CheckWallet';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import AuditDashboard from './pages/AuditDashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        TrustChain © {new Date().getFullYear()} — Blockchain Final Year Project
      </footer>
    </div>
  );
}
