/**
 * Dahotre Arts — Design System Configuration
 * ============================================
 * 
 * Central source of truth for all design tokens used across the application.
 * Import this file whenever you need color, spacing, or typography values
 * instead of hardcoding hex values in components.
 * 
 * Usage:
 *   import { colors, typography } from "@/lib/design-system";
 *   
 *   // In a component:
 *   <div style={{ color: colors.accent.primary }}>Highlighted text</div>
 *   
 *   // In Tailwind classes, use the CSS custom properties defined in globals.css
 *   // which mirror these values:
 *   <div className="text-[var(--accent)]">Highlighted text</div>
 * 
 * Naming Convention:
 *   - `accent.*`    → Brand orange, used for primary CTAs, active states, highlights
 *   - `semantic.*`  → Meaningful status colors (success/warning/danger/info)
 *   - `surface.*`   → Background layers (body → card → elevated)
 *   - `border.*`    → Border colors at rest and on hover
 *   - `text.*`      → Text hierarchy (primary → secondary → muted)
 */

// ─── Brand Accent ────────────────────────────────────────────────
// The primary orange accent used for active nav items, CTAs, links,
// chart fills, and any element that should draw attention.
export const accent = {
  /** Primary brand orange — buttons, active states, chart fills */
  primary: "#F97316",        // orange-500

  /** Lighter orange — hover states, secondary highlights */
  secondary: "#FB923C",      // orange-400

  /** Subtle orange tint — backgrounds of active/selected items */
  muted: "rgba(249, 115, 22, 0.10)",

  /** Orange glow — box-shadow for CTA buttons and focus rings */
  glow: "rgba(249, 115, 22, 0.4)",

  /** Faint orange — borders around active elements */
  border: "rgba(249, 115, 22, 0.20)",
} as const;

// ─── Semantic Status Colors ──────────────────────────────────────
// These convey meaning and should NOT be changed to match the brand.
// Green = good/complete, Amber = caution/pending, Red = error/danger.
export const semantic = {
  /** Revenue, completed orders, positive metrics */
  success: "#22C55E",        // green-500
  successMuted: "rgba(34, 197, 94, 0.10)",
  successBorder: "rgba(34, 197, 94, 0.20)",

  /** Pending orders, low stock warnings */
  warning: "#F59E0B",        // amber-500
  warningMuted: "rgba(245, 158, 11, 0.10)",
  warningBorder: "rgba(245, 158, 11, 0.20)",

  /** Cancelled orders, out-of-stock, outstanding dues */
  danger: "#EF4444",         // red-500
  dangerMuted: "rgba(239, 68, 68, 0.10)",
  dangerBorder: "rgba(239, 68, 68, 0.20)",

  /** Informational badges, secondary links */
  info: "#3B82F6",           // blue-500
  infoMuted: "rgba(59, 130, 246, 0.10)",
  infoBorder: "rgba(59, 130, 246, 0.20)",
} as const;

// ─── Surface / Background Layers ─────────────────────────────────
// Three-tier depth system for dark mode. Deeper = further back.
// Body (deepest) → Card (middle) → Elevated (popover/modal/hover).
export const surface = {
  /** Page body background — deepest, near-OLED black */
  body: "#0A0A0A",

  /** Card backgrounds — sidebar, KPI cards, chart containers */
  card: "#111111",

  /** Elevated surfaces — dropdowns, modals, hover card states */
  elevated: "#1A1A1A",
} as const;

// ─── Borders ─────────────────────────────────────────────────────
// Subtle borders for card edges; slightly brighter on hover.
export const border = {
  /** Default border — card edges, dividers */
  default: "#1F1F1F",

  /** Hover/focus border — interactive card boundaries */
  hover: "#2A2A2A",
} as const;

// ─── Text Hierarchy ──────────────────────────────────────────────
// Three levels of text contrast for visual hierarchy.
export const text = {
  /** Primary text — headings, KPI values, important labels */
  primary: "#F5F5F5",

  /** Secondary text — body copy, descriptions, table cells */
  secondary: "#A3A3A3",

  /** Muted text — captions, timestamps, helper text */
  muted: "#737373",
} as const;

// ─── Typography ──────────────────────────────────────────────────
// Font families for the application. Inter for UI, Fira Code for data.
export const typography = {
  /** Primary sans-serif — all UI text, labels, buttons */
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif",

  /** Monospace — order numbers, product codes, KPI values, prices */
  mono: "'Fira Code', ui-monospace, monospace",
} as const;

// ─── Chart Colors ────────────────────────────────────────────────
// Colors specifically for Recharts / data visualization.
export const chart = {
  /** Primary chart fill — bar charts, area charts */
  fill: "#F97316",

  /** Chart gradient start (top of area) */
  gradientStart: "rgba(249, 115, 22, 0.30)",

  /** Chart gradient end (bottom of area, fades to transparent) */
  gradientEnd: "rgba(249, 115, 22, 0)",

  /** Grid lines inside charts */
  grid: "#1F1F1F",

  /** Axis label color */
  axis: "#737373",

  /** Tooltip background */
  tooltipBg: "#111111",

  /** Tooltip border */
  tooltipBorder: "#2A2A2A",

  /** Average reference line */
  avgLine: "#F59E0B",
} as const;

// ─── Transitions ─────────────────────────────────────────────────
// Consistent animation durations. Keep between 150-300ms per UX guidelines.
export const transitions = {
  /** Fast — hover color changes, opacity */
  fast: "150ms",

  /** Normal — most interactive transitions */
  normal: "200ms",

  /** Slow — layout shifts, accordion open/close */
  slow: "300ms",
} as const;

// ─── Combined Export ─────────────────────────────────────────────
// Single default export for convenience:
//   import ds from "@/lib/design-system";
//   ds.accent.primary  →  "#F97316"
const designSystem = {
  accent,
  semantic,
  surface,
  border,
  text,
  typography,
  chart,
  transitions,
} as const;

export default designSystem;
