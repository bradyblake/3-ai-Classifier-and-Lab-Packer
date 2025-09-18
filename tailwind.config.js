module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      scale: {
        '25': '.25',
        '40': '.4',
        '60': '.6',
        '80': '.8',
        '90': '.9',
        '100': '1',
        '110': '1.1',
        '125': '1.25',
        '150': '1.5',
        '200': '2',
      },
      transitionProperty: {
        'transform': 'transform',
      },
    },
  },
  plugins: [],
};