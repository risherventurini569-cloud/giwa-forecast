/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 18px 52px rgba(64, 73, 149, 0.12)",
        card: "0 8px 28px rgba(27, 39, 94, 0.08)"
      },
      colors: {
        ink: "#111938",
        indigo: { 50: "#eef0ff", 100: "#e2e6ff", 500: "#5b4cf5", 600: "#4938e8", 700: "#3a2fc0" },
        yes: { 50: "#edfcf4", 100: "#d5f7e4", 500: "#10a965", 600: "#078955" },
        no: { 50: "#fff1f1", 100: "#ffe0df", 500: "#ea5b5d", 600: "#cf3f44" }
      },
      backgroundImage: {
        "hero-mesh": "radial-gradient(circle at 12% 10%, rgba(91,76,245,.16), transparent 29%), radial-gradient(circle at 72% 12%, rgba(81,167,255,.13), transparent 23%), radial-gradient(circle at 82% 78%, rgba(159,236,201,.17), transparent 25%), linear-gradient(180deg,#fbfcff 0%,#f5f7ff 100%)"
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } }
      },
      animation: { float: "float 6s ease-in-out infinite", pulseSoft: "pulseSoft 2s ease-in-out infinite" }
    }
  },
  plugins: []
};
