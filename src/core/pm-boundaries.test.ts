import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from './amount';
import { executionWindow, type StrategyConfig, validateStrategy } from './strategy';

const NOW = Date.parse('2026-01-01T00:00:00Z');
const strategy: StrategyConfig = {
  amount: '10', executions: 2, principalBudget: '20', gasBudget: '0',
  offset: 0, window: 1, slippageBps: 0, expiry: '2999-01-01',
  recipient: '0x1111111111111111111111111111111111111111',
};
const windowInput = { now: 110, blockStart: 100, blockDuration: 20, offset: 5, window: 10, observedAt: 110 };

describe('PM F03 strategy boundaries', () => {
  it.each([
    ['invalid expiry', { expiry: 'not-a-date' }],
    ['NaN offset', { offset: Number.NaN }],
    ['NaN slippage', { slippageBps: Number.NaN }],
    ['blank gas', { gasBudget: '' }],
    ['whitespace amount', { amount: ' 10' }],
    ['hex amount', { amount: '0x10' }],
    ['infinite executions', { executions: Number.POSITIVE_INFINITY }],
    ['fractional window', { window: 1.5 }],
    ['unsafe offset', { offset: Number.MAX_SAFE_INTEGER + 1 }],
  ])('rejects %s', (_name, update) => {
    expect(validateStrategy({ ...strategy, ...update }, NOW)).not.toEqual([]);
  });

  it('accepts canonical amounts including a zero gas budget', () => {
    expect(validateStrategy(strategy, NOW)).toEqual([]);
  });

  it.each(['', ' ', '-1', '+1', '1e3', '01', '1.0'])('rejects non-canonical amount %j', (amount) => {
    expect(validateStrategy({ ...strategy, amount }, NOW)).not.toEqual([]);
  });

  it('rejects an expired date using an injected clock', () => {
    expect(validateStrategy({ ...strategy, expiry: '2025-01-01' }, NOW)).toContain('Expiry must be a valid future date');
  });
});

describe('PM F03 execution-window boundaries', () => {
  it.each(['now', 'offset', 'observedAt'] as const)('rejects NaN %s', (field) => {
    expect(() => executionWindow({ ...windowInput, [field]: Number.NaN })).toThrow(/safe integers/);
  });

  it.each([
    { now: Number.POSITIVE_INFINITY },
    { blockDuration: 20.5 },
    { window: Number.MAX_SAFE_INTEGER + 1 },
    { blockStart: Number.MAX_SAFE_INTEGER, offset: 1, window: 1 },
  ])('rejects invalid or overflowing values: %j', (update) => {
    expect(() => executionWindow({ ...windowInput, ...update })).toThrow();
  });

  it('includes the start boundary and excludes the end boundary', () => {
    expect(executionWindow({ ...windowInput, now: 105, observedAt: 105 })).toBe('EXECUTE');
    expect(executionWindow({ ...windowInput, now: 115, observedAt: 115 })).toBe('SKIP');
  });

  it('stops on stale data and rejects observations from the future', () => {
    expect(executionWindow({ ...windowInput, now: 141, observedAt: 110 })).toBe('STALE_DATA');
    expect(() => executionWindow({ ...windowInput, observedAt: 111 })).toThrow(/future/);
  });
});

describe('PM F05 amount display boundaries', () => {
  it('does not render one wei as exact zero', () => {
    expect(formatAmount(parseAmount('0.000000000000000001', 18, 'ETH'))).toBe('0.000000000000000001 ETH');
  });

  it('distinguishes real zero and unknown values', () => {
    expect(formatAmount(parseAmount('0', 18, 'ETH'))).toBe('0 ETH');
    expect(formatAmount(null)).toBe('Unknown');
  });

  it('formats large integers without floating-point precision loss', () => {
    expect(formatAmount(parseAmount('900719925474099312345678.1234', 4, 'HBTC'))).toBe('900719925474099312345678.1234 HBTC');
  });

  it('rejects invalid display metadata', () => {
    expect(() => formatAmount({ value: 1n, decimals: Number.NaN, symbol: 'ETH' })).toThrow(/decimals/);
    expect(() => formatAmount({ value: 1n, decimals: 18, symbol: 'ETH' }, 1.5)).toThrow(/fraction/);
    expect(() => formatAmount({ value: -1n, decimals: 18, symbol: 'ETH' })).toThrow(/negative/);
  });
});
