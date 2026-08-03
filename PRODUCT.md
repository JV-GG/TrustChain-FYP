# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Campaign Creators, Non-Profits, and Community Organizations seeking to launch transparent crowdfunding campaigns on Ethereum (Sepolia testnet). They need to establish on-chain verification, demonstrate non-reentrant vault security, and provide donors with real-time auditability to maximize trust and funding.

## Product Purpose
TrustChain provides a transparent, secure, and verifiable crowdfunding platform. It eliminates fraud and donor hesitation through automated risk scoring, verified creator badges, non-reentrant security escrow vaults, and open disbursement tracking. Success means high campaign conversion, instant trust verification, and clear financial transparency.

## Positioning
The first Web3 crowdfunding platform pairing on-chain smart contract security vaults with automated risk assessment (drain ratio analysis, CryptoScamDB blacklists) and real-time transaction timeline audits.

## Operating Context
- **Primary Workflows**: Campaign creation, campaign discovery & filtering, funding/donations via Web3 wallets (RainbowKit/wagmi), fund disbursement, and wallet risk audit checks.
- **Environments**: Web application built with React 19, Vite, Tailwind CSS v4, Viem/Wagmi, and Recharts.
- **Network**: Ethereum Sepolia Testnet smart contract integration (`0xe9938bBD7675f92ff4802cBD341BBAA81aA1FA14`).

## Capabilities and Constraints
- **Capabilities**: On-chain campaign registration, ETH donation transfers, milestone disbursement tracking, risk score computation (0-100), verification badges (`VERIFIED`, `UNVERIFIED`), and Recharts analytics.
- **Constraints**: Web3 wallet required for write operations (connect wallet modal); Sepolia ETH network target.
- **Visual Direction Commitment**: Clean Minimalist Institutional — subtle borders, high contrast readability, ultra-restrained color, maximum clarity, avoiding decorative AI gradients or noisy dark-mode glow.

## Brand Commitments
- **Name**: TrustChain
- **Tagline**: Autonomous Blockchain Risk Verification & Transparent Crowdfunding
- **Identity**: Professional, institutional, high-trust, authoritative, crisp typography, and restrained accent palette.

## Evidence on Hand
- Working smart contract deployed at `0xe9938bBD7675f92ff4802cBD341BBAA81aA1FA14` on Sepolia.
- Active frontend app source at `frontend/src/` with pages for Home, Campaigns, CampaignDetail, CreateCampaign, CheckWallet, and AuditDashboard.

## Product Principles
1. **Clarity Over Decoration**: High contrast readability, restrained colors, and zero visual clutter. Information hierarchy must lead every viewport.
2. **Instant Verifiability**: Security metrics (escrow ratio, risk score, verification badge) are front-and-center so users can assess trust in under 3 seconds.
3. **Seamless Funding Flow**: Campaign exploration, goal progress, and Web3 donation actions are intuitive, frictionless, and touch-optimized.
4. **Institutional Precision**: Precise typography, structured cards, data tables, and subtle micro-interactions that feel engineered and dependable.

## Accessibility & Inclusion
- WCAG 2.1 AA compliance: contrast >= 4.5:1 for body copy.
- Touch target minimum 44x44px for interactive buttons and wallet controls.
- Motion reduction respect (`prefers-reduced-motion: reduce`).
