/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Status colors for work items
        'status-not-started': '#94a3b8',
        'status-in-progress': '#3b82f6',
        'status-blocked': '#ef4444',
        'status-review': '#f59e0b',
        'status-completed': '#22c55e',
        // Item type colors
        'type-mission': '#7c3aed',
        'type-problem': '#dc2626',
        'type-solution': '#2563eb',
        'type-design': '#d946ef',
        'type-project': '#0891b2',
        // Notion-like colors
        'notion-bg': '#ffffff',
        'notion-bg-dark': '#191919',
        'notion-sidebar': '#f7f6f3',
        'notion-hover': '#ebebea',
        'notion-text': '#37352f',
        'notion-text-light': '#6b7280',
      },
      fontFamily: {
        notion: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica',
          'Apple Color Emoji',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
