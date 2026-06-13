import type { Config } from "tailwindcss";

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
          dim: "#94A3B8",
        },
        // Primary accent — professional azure (AA contrast on white)
        cyan: {
          DEFAULT: "#0284C7",
          glow: "#38BDF8",
        },
        // Secondary accent — trust teal
        teal: {
          DEFAULT: "#0D9488",
          glow: "#14B8A6",
        },
        // Positive / money
        emerald: {
          DEFAULT: "#059669",
          glow: "#10B981",
        },
        // Brand accents kept
        navy: {
          DEFAULT: "#0D3349",
          dark: "#081E2D",
          mid: "#1A4A6B",
          light: "#1E5580",
        },
        // Refined corporate gold — premium accent, used sparingly
        mustard: {
          DEFAULT: "#CBA351",
          light: "#E3C176",
          pale: "#F4EAD2",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#E8C96A",
          pale: "#F8F0D8",
          glow: "#F0D060",
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
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.08)",
        cardHover:
          "0 0 0 1px rgba(2,132,199,0.25), 0 16px 40px rgba(15,23,42,0.12)",
        focus: "0 0 0 3px rgba(2,132,199,0.30)",
        glow: "0 6px 20px rgba(2,132,199,0.25)",
        gold: "0 4px 24px rgba(212,175,55,0.25)",
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
