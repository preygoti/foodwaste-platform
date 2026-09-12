/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f8f3",
          100: "#e1efe4",
          200: "#c3dfcb",
          300: "#9ec9a9",
          400: "#81c784", // Secondary requested Light Green (#81C784)
          500: "#4caf50",
          600: "#388e3c",
          700: "#2e7d32", // Primary requested Deep Green (#2E7D32)
          800: "#1b5e20",
          900: "#133f17",
          950: "#0b260e",
        },
        wheat: {
          50: "#f8faf8",  // Requested Soft White background (#F8FAF8)
          100: "#f0f4f0",
          200: "#e2eae2",
          300: "#cbd6cb",
          400: "#aebfae",
          500: "#8ea48e",
        },
        tomato: {
          50: "#fff5f5",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#ff9800", // Requested Warm Orange Accent (#FF9800)
          600: "#f57c00",
          700: "#e65100",
          800: "#b23c00",
          900: "#7c2800",
        },
        charcoal: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937", // Requested Dark Text (#1F2937)
          900: "#111827",
          950: "#030712",
        },
      },
      spacing: {
        88: "22rem",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Public Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
}

