/**
 * Tailwind build config (replaces the Play CDN that used to compile CSS in the browser).
 * Rebuild after changing classes in index.html, 404.html or src/: `npm run build:css`
 */
module.exports = {
  content: ['./index.html', './404.html', './src/**/*.js', '!./src/components/*.bundle.js'],
  theme: {
    extend: {
      colors: {
        'ca-surface': '#fdfdfb',
        'ca-ink': '#191510',
        'ca-gray': '#7a7263',
        'ca-chrome': '#ebe4d3',
        'ca-tick': '#c4b9a3',
        'ca-blue': '#2b57d6',
        'ca-cyan': '#b7c6ef',
        'ca-yellow': '#f7c948',
        'ca-yellow-soft': '#f4e5b2',
        'ca-magenta': '#ff4d8d',
        'ca-pink-soft': '#ffc6da',
        'ca-green': '#16b06a',
        'ca-mint': '#a9dfc6',
        'ca-orange': '#ff6a35',
      },
      fontFamily: {
        display: ['"Archivo Black"', '"Handjet"', 'Impact', 'sans-serif'],
        hand: ['"Just Me Again Down Here"', 'cursive'],
        mono: ['"DM Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
        grotesk: ['"Bricolage Grotesque"', '"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
