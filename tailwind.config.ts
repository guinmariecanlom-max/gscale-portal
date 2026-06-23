import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        butter: '#FFFDB4',
        ink: '#2A2520',
        cream: '#EBE3D3',
        'cream-light': '#FAF8F0',
      },
      fontFamily: {
        sans: ['Arial', 'Arial Unicode MS', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
