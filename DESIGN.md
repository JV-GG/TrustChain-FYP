# Design System

<!-- impeccable:design-schema 1 -->

## Visual Identity & Aesthetic World

**Direction**: Clean Minimalist Institutional
An authoritative, crisp, and high-trust interface system designed for campaign creators and non-profits. Emphasizes maximum legibility, subtle structural borders, ultra-restrained accent colors, and structural clarity over decorative slop.

---

## Color System (Restrained OKLCH)

### Light Mode Ramps
- **Background App**: `oklch(0.985 0.005 240)` (`#f8fafc`)
- **Card Surface**: `oklch(1.0 0 0)` (`#ffffff`)
- **Card Surface Subtly Inset**: `oklch(0.965 0.005 240)` (`#f1f5f9`)
- **Text Primary (Ink)**: `oklch(0.20 0.02 240)` (`#0f172a`)
- **Text Muted**: `oklch(0.48 0.02 240)` (`#475569`)
- **Border Default**: `oklch(0.90 0.01 240)` (`#e2e8f0`)
- **Accent Primary (Verification Emerald)**: `oklch(0.62 0.17 150)` (`#059669`)
- **Accent Interactive (Slate / Navy)**: `oklch(0.30 0.05 250)` (`#1e293b`)

### Dark Mode Ramps
- **Background App**: `oklch(0.14 0.02 240)` (`#090d16`)
- **Card Surface**: `oklch(0.18 0.02 240)` (`#111827`)
- **Card Surface Subtly Inset**: `oklch(0.22 0.02 240)` (`#1f2937`)
- **Text Primary (Ink)**: `oklch(0.96 0.005 240)` (`#f8fafc`)
- **Text Muted**: `oklch(0.68 0.02 240)` (`#94a3b8`)
- **Border Default**: `oklch(0.28 0.02 240)` (`#334155`)
- **Accent Primary (Verification Emerald)**: `oklch(0.72 0.16 150)` (`#10b981`)
- **Accent Interactive (Slate Light)**: `oklch(0.85 0.02 240)` (`#e2e8f0`)

---

## Typography

- **Font Family**: Modern Geometric Sans (`Inter`, `system-ui`, `-apple-system`, `sans-serif`)
- **Data & Monospace**: `ui-monospace`, `SFMono-Regular`, `Consolas`, `monospace`
- **Heading Rules**:
  - `h1`: 2.5rem – 3.75rem (40px–60px), Font Weight 800 (Extrabold), Tracking `-0.03em`, `text-wrap: balance`
  - `h2`: 1.75rem – 2.25rem (28px–36px), Font Weight 800 (Extrabold), Tracking `-0.02em`
  - `h3`: 1.25rem – 1.5rem (20px–24px), Font Weight 700 (Bold)
- **Body & Measure**: 65–75ch max measure for prose, line-height 1.625 for optimal readability.

---

## Motion & Interactions

- **Easing**: Exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`)
- **Duration**: Fast micro-interactions (150ms–250ms)
- **Motion Reduction**: `motion-reduce:transition-none` & `motion-reduce:animate-none` applied universally
- **Interactive Feedback**: Distinct hover borders (`border-emerald-500/50`), subtle 1px elevation lift (`transform: translateY(-2px)`), no unprompted image zooming.

---

## Component Guidelines

### 1. Campaign Discovery Cards
- Crisp white/dark-slate background with subtle 1px border.
- Institutional category pill (`oklch(0.62 0.17 150)` / emerald border).
- High-contrast goal progress bar with clear `ETH Raised` fraction and percentage pill.

### 2. Campaign Detail & Donation Modal
- Hero section featuring verification badge, owner wallet shortcode, and key funding stats.
- Clear numeric donation input with min 44px tap targets for preset ETH buttons (0.01, 0.05, 0.1 ETH).
- Instant transaction feedback state.

### 3. Risk & Verification Badges
- `VERIFIED`: Solid emerald badge with subtle checkmark.
- `UNVERIFIED`: Neutral cool gray pill with informative hover tooltip.
- `HIGH RISK`: Controlled amber/rose warning banner.
