/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f6f3",
          100: "#dfe9e2",
          400: "#4c7c59",
          600: "#2d5940",
          800: "#1f3a2e",
          900: "#152820",
        },
        wheat: {
          50: "#fbf8f1",
          100: "#f5efe0",
          200: "#ece1c8",
        },
        tomato: {
          400: "#d4573f",
          500: "#c1442d",
          600: "#a3371f",
        },
        gold: {
          400: "#e0b859",
          500: "#d4a94c",
          600: "#b48d38",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Public Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
}

