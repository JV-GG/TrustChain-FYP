# Design System — Apple Design Human Interface

<!-- apple-design-schema 1 -->

## Visual Identity & Aesthetic World

**Direction**: Apple Human Interface / Clean Frosted Translucency
An authoritative, crisp, and high-trust interface system inspired by Apple's WWDC *Designing Fluid Interfaces*, macOS/iOS materials, and Emil Kowalski's craft standards. Emphasizes optical typography hierarchy, continuous curvature, translucent glass surfaces, dual-layer ambient/key shadows, and instant physical touch feedback.

---

## 1. Color System (Apple System Vibrancy)

### Light Mode Ramps
- **Background App**: `#f5f5f7` (Apple Light Canvas)
- **Glass Card Surface**: `rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(24px) saturate(180%)`
- **Solid Card Surface**: `#ffffff`
- **Inset Wells**: `rgba(0, 0, 0, 0.035)`
- **Text Primary (Ink)**: `#1d1d1f`
- **Text Secondary**: `#515154`
- **Text Muted**: `#86868b`
- **Border Default**: `rgba(0, 0, 0, 0.08)`
- **Border Subtle**: `rgba(0, 0, 0, 0.04)`
- **Apple System Green (Verified)**: `#34c759` (Tint: `rgba(52, 199, 89, 0.12)`)
- **Apple System Blue (Interactive)**: `#0071e3` (Tint: `rgba(0, 113, 227, 0.10)`)
- **Apple System Amber (Caution)**: `#ff9500` (Tint: `rgba(255, 149, 0, 0.12)`)
- **Apple System Red (Flagged)**: `#ff3b30` (Tint: `rgba(255, 59, 48, 0.12)`)

### Dark Mode Ramps
- **Background App**: `#000000` (Apple True Black Canvas)
- **Glass Card Surface**: `rgba(28, 28, 32, 0.72)` with `backdrop-filter: blur(24px) saturate(180%)`
- **Solid Card Surface**: `#1c1c1e`
- **Inset Wells**: `rgba(255, 255, 255, 0.05)`
- **Text Primary (Ink)**: `#f5f5f7`
- **Text Secondary**: `#a1a1a6`
- **Text Muted**: `#6e6e73`
- **Border Default**: `rgba(255, 255, 255, 0.10)`
- **Border Subtle**: `rgba(255, 255, 255, 0.06)`
- **Apple System Green (Verified)**: `#30d158` (Tint: `rgba(48, 209, 88, 0.15)`)
- **Apple System Blue (Interactive)**: `#2997ff` (Tint: `rgba(41, 151, 255, 0.15)`)
- **Apple System Amber (Caution)**: `#ff9f0a` (Tint: `rgba(255, 159, 10, 0.15)`)
- **Apple System Red (Flagged)**: `#ff453a` (Tint: `rgba(255, 69, 58, 0.15)`)

---

## 2. Typography & Optical Hierarchy

- **System Stack**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif`
- **Monospace Stack**: `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace`
- **Display Headings**:
  - `display-title`: 40px–60px, Weight 800, Tracking `-0.035em`, Line-height `1.08`, `text-wrap: balance`
  - `section-title`: 24px–36px, Weight 700, Tracking `-0.028em`, Line-height `1.15`
  - `headline`: 20px, Weight 600, Tracking `-0.02em`
- **Uppercase Labels**: 11px, Weight 700, Tracking `+0.05em`, uppercase

---

## 3. Motion & Micro-Interactions

- **Instant Response on Press**: `.apple-press:active { transform: scale(0.97); opacity: 0.90; transition: transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1); }`
- **Critically Damped Settling**: `cubic-bezier(0.16, 1, 0.3, 1)`
- **Continuous Elevation**: Smooth 3px lift on hover (`hover-lift`) with dual-layer shadow expansion.
- **Segmented Controls**: Native sliding pill segmented controls (`.apple-segmented`).
- **Reduced Motion**: Full compliance with `prefers-reduced-motion: reduce`.
