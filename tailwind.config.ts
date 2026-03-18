import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        qb: {
          bg: "#0d0d1a",
          panel: "rgba(255,255,255,0.06)",
          panel2: "rgba(255,255,255,0.09)",
          border: "rgba(255,255,255,0.12)",
          purple: "#7c3aed",
          amber: "#f59e0b",
          cyan: "#06b6d4",
          red: "#ef4444",
          green: "#22c55e",
        },
      },
      fontFamily: {
        logo: ["var(--font-righteous)", "system-ui", "sans-serif"],
        body: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glowPurple: "0 0 0 1px rgba(124,58,237,0.35), 0 20px 50px rgba(124,58,237,0.15)",
        glowAmber: "0 0 0 1px rgba(245,158,11,0.35), 0 20px 50px rgba(245,158,11,0.15)",
        glowCyan: "0 0 0 1px rgba(6,182,212,0.35), 0 20px 50px rgba(6,182,212,0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
