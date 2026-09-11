import { describe, expect, it } from 'vitest';
import { parseAmount, formatAmount } from './amount';
import { executionWindow, validateStrategy, type StrategyConfig } from './strategy';

const now = Date.parse('2026-01-01T00:00:00Z');
const valid: StrategyConfig = {
  amount: '10', executions: 2, principalBudget: '20', gasBudget: '0',
  offset: 0, window: 1, slippageBps: 0, expiry: '2999-01-01',
  recipient: '0x1111111111111111111111111111111111111111',
};
const timing = { now: 110, blockStart: 100, blockDuration: 20, offset: 5, window: 10, observedAt: 110 };

describe('PM independent formatting and parsing compatibility', () => {
  it.each([[0,'12'],[1,'1.2'],[2,'1.23'],[3,'1.234']] as const)('supports default formatting for %i decimals', (decimals, value) => {
    expect(formatAmount(parseAmount(value, decimals, 'X'))).toBe(`${value} X`);
  });
  it.each([NaN, Infinity, -1, 256, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid decimals %s', d => {
    expect(() => parseAmount('1', d)).toThrow();
    expect(() => formatAmount({value: 1n, decimals: d, symbol:'X'})).toThrow();
  });
  it.each([NaN, Infinity, -1, 1.5, 19])('rejects explicit invalid fraction %s', d => {
    expect(() => formatAmount(parseAmount('1',18),d)).toThrow();
  });
  it('rejects explicit fraction larger than asset precision', () => {
    expect(() => formatAmount(parseAmount('1',2),4)).toThrow();
  });
  it('preserves 1 wei, real zero, Unknown and large integer precision', () => {
    expect(formatAmount(parseAmount('0.000000000000000001',18,'ETH'))).toBe('0.000000000000000001 ETH');
    expect(formatAmount(parseAmount('0',18,'ETH'))).toBe('0 ETH');
    expect(formatAmount(null)).toBe('Unknown');
    const value='123456789012345678901234567890.123456789012345678';
    expect(formatAmount(parseAmount(value,18,'X'),18)).toBe(`${value} X`);
  });
  it.each(['',' ','-1','+1','0x10','1e3','01'])('rejects invalid amount %j', x => {
    expect(() => parseAmount(x,18)).toThrow();
  });
});
describe('PM original regressions and time safety', () => {
  it.each([
    {expiry:'not-a-date'}, {offset:NaN}, {slippageBps:NaN}, {gasBudget:''},
    {executions:Infinity}, {window:1.5}, {amount:'0x10'},
  ])('rejects invalid strategy %j', update => {
    expect(validateStrategy({...valid,...update}, now).length).toBeGreaterThan(0);
  });
  it('retains legal zero gas and rejects expired strategy', () => {
    expect(validateStrategy(valid,now)).toEqual([]);
    expect(validateStrategy({...valid,expiry:'2025-01-01'},now).length).toBeGreaterThan(0);
  });
  it.each(['now','offset','observedAt'] as const)('rejects NaN window field %s', field => {
    expect(() => executionWindow({...timing,[field]:NaN})).toThrow();
  });
  it('honors included start, excluded end, stale and future observation', () => {
    expect(executionWindow({...timing,now:105,observedAt:105})).toBe('EXECUTE');
    expect(executionWindow({...timing,now:115,observedAt:115})).toBe('SKIP');
    expect(executionWindow({...timing,now:141})).toBe('STALE_DATA');
    expect(() => executionWindow({...timing,observedAt:111})).toThrow();
    expect(() => executionWindow({...timing,blockStart:Number.MAX_SAFE_INTEGER})).toThrow();
  });
});
