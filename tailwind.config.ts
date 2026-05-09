import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class', 'media'],
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: [
          '"Source Sans 3 Variable"',
          '"Source Sans 3"',
          '"Source Sans Pro"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.45' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.5' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
        '3xl': ['28px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.15' }],
      },
      colors: {
        /* shadcn-compat aliases */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
        },

        /* Road Asfaltos família — disponíveis como utilities (asf-950, amb-400, etc.) */
        asf: {
          950: 'hsl(var(--asf-950))',
          900: 'hsl(var(--asf-900))',
          800: 'hsl(var(--asf-800))',
          700: 'hsl(var(--asf-700))',
        },
        amb: {
          50: 'hsl(var(--amb-50))',
          100: 'hsl(var(--amb-100))',
          200: 'hsl(var(--amb-200))',
          300: 'hsl(var(--amb-300))',
          400: 'hsl(var(--amb-400))',
          500: 'hsl(var(--amb-500))',
          600: 'hsl(var(--amb-600))',
        },
        brand: {
          50: 'hsl(var(--amb-50))',
          100: 'hsl(var(--amb-100))',
          200: 'hsl(var(--amb-200))',
          300: 'hsl(var(--amb-300))',
          400: 'hsl(var(--amb-400))',
          500: 'hsl(var(--amb-500))',
          600: 'hsl(var(--amb-600))',
        },
        surf: {
          50: 'hsl(var(--surf-50))',
          100: 'hsl(var(--surf-100))',
          200: 'hsl(var(--surf-200))',
          300: 'hsl(var(--surf-300))',
        },
        ink: {
          400: 'hsl(var(--ink-400))',
          500: 'hsl(var(--ink-500))',
          700: 'hsl(var(--ink-700))',
        },
        brd: {
          100: 'hsl(var(--brd-100))',
          200: 'hsl(var(--brd-200))',
        },
        grn: {
          50: 'hsl(var(--grn-50))',
          600: 'hsl(var(--grn-600))',
        },
        red: {
          50: 'hsl(var(--red-50))',
          600: 'hsl(var(--red-600))',
        },
        blu: {
          50: 'hsl(var(--blu-50))',
          600: 'hsl(var(--blu-600))',
        },
        pur: {
          50: 'hsl(var(--pur-50))',
          600: 'hsl(var(--pur-600))',
        },
      },
      spacing: {
        topbar: '50px',
        sidebar: '240px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'route-progress': {
          '0%': { transform: 'translateX(-100%)' },
          '40%': { transform: 'translateX(-30%)' },
          '80%': { transform: 'translateX(-5%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        'route-progress': 'route-progress 600ms ease-out forwards',
      },
    },
  },
  plugins: [animate],
} satisfies Config
