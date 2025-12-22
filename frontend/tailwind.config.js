/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
        ring: 'var(--ring)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        success: '#15803d',
        warning: '#c2410c',
        danger: '#991b1b',
        dispoLibre: '#16a34a',
        dispoPresque: '#ea580c',
        dispoPlein: '#dc2626'
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        DEFAULT: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)'
      },
      boxShadow: {
        card: '0 2px 6px rgba(0,0,0,0.06)',
        focus: '0 0 0 3px rgba(44,61,80,0.35)'
      }
    }
  },
  plugins: [],
};
