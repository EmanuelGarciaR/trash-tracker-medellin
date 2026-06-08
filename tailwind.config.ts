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
        waste: {
          orange: "#e07506",
          lightOrange: "#eb963d",
          light: "#e6e2ef",
          purple: "#8e7cc3",
          deepPurple: "#6444c0",
        }
      },
    },
  },
  plugins: [],
};
export default config;
