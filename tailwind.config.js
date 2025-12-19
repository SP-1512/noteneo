/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF5F1F",
          dark: "#E64A00",
        },
        secondary: {
          DEFAULT: "#2C3E50",
        },
        background: "#F2F3F5",
        surface: "#FFFFFF",
        muted: "#BFC5CE",
      },
    },
  },
  plugins: [],
}
