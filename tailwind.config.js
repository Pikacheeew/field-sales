/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eaf6ec",
          100: "#cfead5",
          400: "#3f9d55",
          500: "#1b7a3d",
          600: "#146030",
          700: "#0f4a25"
        },
        accent: {
          500: "#f6a623"
        }
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)"
      }
    }
  },
  plugins: []
};
