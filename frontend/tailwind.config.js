/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2f9",
          100: "#d6e0f0",
          200: "#adc1e1",
          300: "#84a2d2",
          400: "#5b83c3",
          500: "#3264b4",
          600: "#1B3B7B",
          700: "#162f63",
          800: "#11234a",
          900: "#0c1732",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
