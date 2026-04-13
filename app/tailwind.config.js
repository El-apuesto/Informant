/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        'void': '#000000',
        'surface': '#0a0a0a',
        'elevated': '#111111',
        'border-dim': '#1e1e1e',
        'neon-red': '#e8151b',
        'neon-glow': '#ff1a1a',
        'neon-dim': '#6b0a0d',
        'chrome': '#c0c0c0',
        'chrome-dim': '#555555',
        'signal': '#00ff88',
        'amber': '#ffaa00',
      },
      fontFamily: {
        'display': ['Rajdhani', 'sans-serif'],
        'mono': ['Share Tech Mono', 'monospace'],
        'body': ['Barlow', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        'neon-red': '0 0 12px #e8151b, 0 0 30px rgba(232,21,27,0.3)',
        'neon-soft': '0 0 40px rgba(232,21,27,0.15)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "neon-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(232,21,27,0.6))" },
          "50%": { filter: "drop-shadow(0 0 20px rgba(232,21,27,0.9))" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)", opacity: "0.15" },
          "100%": { transform: "translateY(100vh)", opacity: "0" },
        },
        "decode-flash": {
          "0%": { background: "rgba(0, 255, 136, 0.15)" },
          "100%": { background: "transparent" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "blink": "blink 1s step-end infinite",
        "scan-sweep": "scan-sweep 3s ease-out forwards",
        "decode-flash": "decode-flash 0.5s ease-out forwards",
        "fade-up": "fade-up 0.4s ease forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
