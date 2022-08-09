const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const config = require('./tailwind.config.cjs');

module.exports = {
  plugins: [tailwindcss(config), autoprefixer],
};
