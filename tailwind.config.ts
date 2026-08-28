import type { Config } from "tailwindcss";

/**
 * Only tokens defined in app/globals.css are exposed here.
 *
 * Tailwind's own palette (green-500, slate-700, …) is deliberately NOT
 * extended into components: if a colour is not in this map, it is not part of
 * the design system. See docs/design-system.md.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: "hsl(var(--primary))",
        brand: "hsl(var(--brand))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        good: "hsl(var(--status-good))",
        warn: "hsl(var(--status-warn))",
        bad: "hsl(var(--status-bad))",
        chip: {
          green: "hsl(var(--chip-green))",
          "green-fg": "hsl(var(--chip-green-fg))",
          amber: "hsl(var(--chip-amber))",
          "amber-fg": "hsl(var(--chip-amber-fg))",
          teal: "hsl(var(--chip-teal))",
          "teal-fg": "hsl(var(--chip-teal-fg))",
          rose: "hsl(var(--chip-rose))",
          "rose-fg": "hsl(var(--chip-rose-fg))",
          violet: "hsl(var(--chip-violet))",
          "violet-fg": "hsl(var(--chip-violet-fg))",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        // Low and tight. Panels separate from the page by their white fill,
        // not by heavy shadows.
        sm: "0 1px 2px 0 hsl(222 47% 11% / 0.04)",
        card: "0 1px 2px 0 hsl(222 47% 11% / 0.05), 0 1px 3px 0 hsl(222 47% 11% / 0.04)",
        pop: "0 8px 24px -6px hsl(222 47% 11% / 0.14)",
      },
      spacing: {
        sidebar: "260px",
      },
    },
  },
  plugins: [],
};

export default config;
