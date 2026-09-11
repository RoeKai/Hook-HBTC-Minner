import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from './amount';

describe('PM amount precision compatibility', () => {
  it.each([
    ['7', 0, '7 TOKEN'],
    ['7.1', 1, '7.1 TOKEN'],
    ['7.12', 2, '7.12 TOKEN'],
    ['7.123', 3, '7.123 TOKEN'],
  ])('uses a safe default for %i-decimal assets', (input, decimals, expected) => {
    expect(formatAmount(parseAmount(input, decimals))).toBe(expected);
  });

  it('still rejects explicitly requested precision beyond the asset precision', () => {
    expect(() => formatAmount(parseAmount('1.23', 2), 3)).toThrow(/maximum fraction/);
  });

  it('keeps one wei, real zero, and unknown distinct', () => {
    expect(formatAmount(parseAmount('0.000000000000000001', 18, 'ETH'))).toBe('0.000000000000000001 ETH');
    expect(formatAmount(parseAmount('0', 18, 'ETH'))).toBe('0 ETH');
    expect(formatAmount(null)).toBe('Unknown');
  });

  it('preserves large integer precision without Number conversion', () => {
    expect(formatAmount(parseAmount('900719925474099312345678.123', 3, 'BIG')))
      .toBe('900719925474099312345678.123 BIG');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 256, 1.5])(
    'rejects invalid decimals %s before parsing',
    (decimals) => {
      expect(() => parseAmount('1', decimals)).toThrow(/Invalid decimals/);
    },
  );
});
