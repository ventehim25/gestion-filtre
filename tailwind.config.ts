import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        arabic: ["Noto Sans Arabic", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
