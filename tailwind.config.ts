import type { Config } from "tailwindcss";

/**
 * Suplymate design tokens.
 *
 * Palette discipline:
 *   - Primary (brand):  navy   #0D3349 — nav, primary buttons, dark panels
 *   - Accent:           azure  #0369A1 (cyan.*) — links, active states, data, highlights
 *   - Neutrals:         slate scale via ink.* aliases
 *   - Semantic:         verified/up = emerald · down = red
 *
 * Spacing follows the default 4px scale used on an 8pt rhythm (py-2/4/6/8…).
 * Type scale tokens (text-display-*, text-heading-*) carry their own
 * line-height, tracking, and weight so headings stay consistent everywhere.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clean light corporate theme
        deep: "#FFFFFF",
        base: "#F8FAFC",
        ink: {
          DEFAULT: "#0F172A",
          muted: "#475569",
          dim: "#64748B",
        },
        // Accent — deep azure (AA contrast on white at any size)
        cyan: {
          DEFAULT: "#0369A1",
          glow: "#38BDF8",
          soft: "#F0F7FC",
        },
        // Secondary accent — trust teal
        teal: {
          DEFAULT: "#0F766E",
          glow: "#14B8A6",
        },
        // Positive / money / price-up
        emerald: {
          DEFAULT: "#047857",
          glow: "#10B981",
        },
        // Semantic market colors (fintech up/down language)
        up: {
          DEFAULT: "#047857",
          bright: "#10B981",
          bg: "#ECFDF5",
        },
        down: {
          DEFAULT: "#B91C1C",
          bright: "#F87171",
          bg: "#FEF2F2",
        },
        // Brand primary
        navy: {
          DEFAULT: "#0D3349",
          dark: "#081E2D",
          mid: "#1A4A6B",
          light: "#1E5580",
        },
        // Legacy aliases — map to brand azure (cyan) for backward-compatible class names
        mustard: {
          DEFAULT: "#0369A1",
          light: "#38BDF8",
          pale: "#F0F7FC",
        },
        gold: {
          DEFAULT: "#0369A1",
          light: "#38BDF8",
          pale: "#F0F7FC",
          glow: "#38BDF8",
        },
        ai: {
          glow: "#60A5FA",
          pulse: "#3B82F6",
          mist: "#EFF6FF",
        },
        slate: {
          brand: "#A4B0C8",
          muted: "#6E7C97",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          card: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Single-family type system (Linear/Stripe pattern): display = Inter
        // with tight tracking via the text-display-* tokens below.
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // — type scale tokens (size, line-height, tracking, weight) —
        caption: ["0.75rem", { lineHeight: "1.125rem", letterSpacing: "0.01em" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5rem" }],
        body: ["1rem", { lineHeight: "1.625rem" }],
        "body-lg": ["1.125rem", { lineHeight: "1.875rem" }],
        "heading-sm": [
          "1.125rem",
          { lineHeight: "1.625rem", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        heading: [
          "1.375rem",
          { lineHeight: "1.875rem", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "heading-lg": [
          "1.75rem",
          { lineHeight: "2.25rem", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        display: [
          "2.25rem",
          { lineHeight: "2.625rem", letterSpacing: "-0.025em", fontWeight: "700" },
        ],
        "display-lg": [
          "3rem",
          { lineHeight: "3.25rem", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "display-xl": [
          "3.625rem",
          { lineHeight: "3.875rem", letterSpacing: "-0.033em", fontWeight: "700" },
        ],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        // Layered, low-alpha shadows (Stripe-like): calm at rest, deeper on hover.
        card: "0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.04)",
        cardHover:
          "0 2px 4px rgba(15,23,42,0.04), 0 16px 40px -8px rgba(15,23,42,0.14)",
        focus: "0 0 0 3px rgba(3,105,161,0.28)",
        glow: "0 4px 16px rgba(3,105,161,0.22)",
        gold: "0 4px 24px rgba(3,105,161,0.25)",
        "ai-glow": "0 0 40px rgba(96,165,250,0.15), 0 8px 32px rgba(15,23,42,0.08)",
        glass: "0 1px 2px rgba(15,23,42,0.04), 0 8px 32px rgba(15,23,42,0.06)",
      },
      transitionTimingFunction: {
        cinema: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "aurora-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(6%, -8%) scale(1.15)" },
          "66%": { transform: "translate(-8%, 6%) scale(0.92)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "ai-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "grid-drift": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(40px)" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(3deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "ai-pulse": "ai-pulse 3s ease-in-out infinite",
        "grid-drift": "grid-drift 20s linear infinite",
        "orb-float": "orb-float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
