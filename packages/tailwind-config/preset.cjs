/**
 * Shared Tailwind preset. Both apps spread this, so a token change lands on
 * web and native at once.
 *
 * Every colour resolves through a CSS variable rather than a literal, which is
 * what makes dark mode a variable swap instead of a second class set.
 */
const withOpacity = (variable) => `hsl(var(${variable}) / <alpha-value>)`;

const pair = (name) => ({
  DEFAULT: withOpacity(`--${name}`),
  foreground: withOpacity(`--${name}-foreground`),
});

module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background"),
        foreground: withOpacity("--foreground"),
        card: pair("card"),
        popover: pair("popover"),
        primary: {
          ...pair("primary"),
          muted: withOpacity("--primary-muted"),
        },
        secondary: pair("secondary"),
        muted: pair("muted"),
        accent: pair("accent"),
        destructive: pair("destructive"),
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
    },
  },
  plugins: [],
};
