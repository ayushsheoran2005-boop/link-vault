import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090b0f",
        panel: "#11141a",
        line: "#232832",
        muted: "#858c99",
        accent: "#bbf36a"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 34px rgba(187, 243, 106, 0.09)"
      }
    }
  },
  plugins: [forms]
};
