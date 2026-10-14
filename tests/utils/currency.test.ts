import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../lib/utils/currency';

describe('formatCurrency', () => {
  it('formats USD cents correctly with default currency', () => {
    expect(formatCurrency(3499)).toBe('$34.99');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1800)).toBe('$18.00');
  });

  it('formats international currencies correctly with string shorthand', () => {
    expect(formatCurrency(2499, 'CAD')).toBe('CA$24.99');
    expect(formatCurrency(1999, 'EUR')).toContain('19.99');
  });

  it('formats with custom locale and currency options', () => {
    expect(formatCurrency(2499, { currency: 'CAD', locale: 'en-US' })).toBe('CA$24.99');
    expect(formatCurrency(5000, { currency: 'GBP', locale: 'en-GB' })).toBe('£50.00');
    expect(formatCurrency(3500, { currency: 'EUR', locale: 'fr-FR' })).toContain('35,00');
  });
});
