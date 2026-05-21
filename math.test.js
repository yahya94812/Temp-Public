const { add, multiply } = require('./math');

test('adds 2 + 3 = 5', () => {
  expect(add(2, 3)).toBe(5);
});

test('multiplies 4 * 3 = 12', () => {
  expect(multiply(4, 3)).toBe(12);
});