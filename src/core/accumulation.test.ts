import { describe, expect, it } from 'vitest';
import {
  emissionAt,
  marginalRewards,
  rewardAt,
  selectCandidate,
  type Candidate,
  type DecisionInput,
} from './accumulation';

const candidate = (update: Partial<Candidate> = {}): Candidate => ({
  id: 'base',
  budget: 1_000_000_000_000_000n,
  paid: 900_000_000_000_000n,
  refund: 100_000_000_000_000n,
  work: 800_000_000_000_000n,
  gasWei: 10n,
  claimGasWei: 5n,
  serviceCostNvda: 20n,
  ...update,
});

const input = (update: Partial<DecisionInput> = {}): DecisionInput => ({
  round: 144,
  ownWork: 0n,
  otherWorkScenarios: [0n, 1_000_000_000_000_000n],
  nvdaAvailable: 10_000_000_000_000_000n,
  ethAvailable: 1_000n,
  perRoundCap: 2_000_000_000_000_000n,
  dailyRemaining: 2_000_000_000_000_000n,
  nvdaReserved: 0n,
  ethReserved: 0n,
  nvdaFeeReserve: 0n,
  ethExitReserve: 0n,
  costPerThousandCap: 10n ** 30n,
  now: 1_000,
  fx: { numerator: 2n, denominator: 3n, observedAt: 990, maxAgeSeconds: 30, source: '演示汇率' },
  candidates: [candidate()],
  ...update,
});

describe('BTCNVDA emission and reward math', () => {
  it.each([
    [143, 0, false],
    [144, 0, true],
    [4319, 0, true],
    [4320, 1, true],
  ])('maps round %i to epoch %i and public=%s', (round, epoch, isPublic) => {
    expect(emissionAt(round)).toMatchObject({ epoch, public: isPublic });
  });

  it('handles late emission and target shift boundaries', () => {
    expect(emissionAt(54 * 4320).scheduled).toBe((21_000_000n * 10n ** 18n >> 55n) / 4320n);
    expect(emissionAt(72 * 4320).target).toBe(10_777_023_386_140_748n >> 72n);
    expect(emissionAt(96 * 4320).scheduled).toBe(0n);
    expect(emissionAt(256 * 4320).target).toBe(0n);
  });

  it('rejects invalid rounds and supports zero targets and large integers', () => {
    expect(() => emissionAt(-1)).toThrow(/round/);
    expect(() => emissionAt(Number.MAX_SAFE_INTEGER + 1)).toThrow(/round/);
    expect(rewardAt(10n ** 50n, 0n, 10n ** 30n, 0n)).toBe(10n ** 50n);
    expect(rewardAt(100n, 0n, 0n, 0n)).toBe(0n);
  });

  it('calculates every marginal scenario rather than approximating with maximum competition', () => {
    expect(marginalRewards(1000n, 100n, 100n, 10n, [0n, 100n, 1000n])).toEqual({
      values: [0n, 23n, 9n], low: 0n, high: 23n,
    });
  });

  it('strictly validates bigint values and scenario bounds', () => {
    expect(() => rewardAt(1n, 1n, 1 as unknown as bigint, 0n)).toThrow(/bigint/);
    expect(() => marginalRewards(1n, 1n, 1n, 1n, [])).toThrow(/1至32/);
    expect(() => marginalRewards(1n, 1n, 1n, 1n, Array(33).fill(0n))).toThrow(/1至32/);
  });
});

describe('accumulation candidate selection', () => {
  it('uses ceil FX conversion and conservatively calculated marginal rewards', () => {
    const result = selectCandidate(input());
    expect(result.action).toBe('PARTICIPATE');
    expect(result.selected?.costNvda).toBe(900_000_000_000_030n); // ceil(15 * 2 / 3) + paid + service
    expect(result.selected?.rewardLow).toBeGreaterThan(0n);
    expect(result.selected?.rewardLow).toBeLessThanOrEqual(result.selected!.rewardHigh);
  });

  it('maximizes low reward and applies deterministic cost, budget, then id ties', () => {
    const result = selectCandidate(input({ candidates: [
      candidate({ id: 'z', budget: 1_000_000_000_000_001n, refund: 100_000_000_000_001n }),
      candidate({ id: 'b' }),
      candidate({ id: 'a' }),
      candidate({ id: 'more', budget: 1_100_000_000_000_000n, paid: 1_000_000_000_000_000n, work: 900_000_000_000_000n }),
    ] }));
    expect(result.selected?.id).toBe('more');
    const tied = selectCandidate(input({ candidates: [candidate({ id: 'b' }), candidate({ id: 'a' })] }));
    expect(tied.selected?.id).toBe('a');
  });

  it('enforces exact NVDA, daily, per-round, and ETH hard budgets at one raw boundaries', () => {
    expect(selectCandidate(input({ nvdaAvailable: 1_000_000_000_000_020n })).action).toBe('PARTICIPATE');
    expect(selectCandidate(input({ nvdaAvailable: 1_000_000_000_000_019n })).candidates[0]?.reason).toMatch(/NVDA/);
    expect(selectCandidate(input({ dailyRemaining: 900_000_000_000_020n })).action).toBe('PARTICIPATE');
    expect(selectCandidate(input({ dailyRemaining: 900_000_000_000_019n })).candidates[0]?.reason).toMatch(/每日/);
    expect(selectCandidate(input({ perRoundCap: 999_999_999_999_999n })).candidates[0]?.reason).toMatch(/单轮/);
    expect(selectCandidate(input({ ethAvailable: 15n })).action).toBe('PARTICIPATE');
    expect(selectCandidate(input({ ethAvailable: 14n })).candidates[0]?.reason).toMatch(/ETH/);
  });

  it('uses exact cross multiplication at the cost cap boundary', () => {
    const first = selectCandidate(input()).selected!;
    expect(selectCandidate(input({ costPerThousandCap: first.costPerThousand! })).action).toBe('PARTICIPATE');
    expect(selectCandidate(input({ costPerThousandCap: first.costPerThousand! - 1n })).action).toBe('SKIP');
  });

  it.each([
    null,
    { numerator: 0n, denominator: 1n, observedAt: 990, maxAgeSeconds: 30, source: '演示' },
    { numerator: 1n, denominator: 0n, observedAt: 990, maxAgeSeconds: 30, source: '演示' },
    { numerator: 1n, denominator: 1n, observedAt: 900, maxAgeSeconds: 30, source: '演示' },
    { numerator: 1n, denominator: 1n, observedAt: 1001, maxAgeSeconds: 30, source: '演示' },
  ])('waits with null costs for unavailable FX %#', (fx) => {
    const result = selectCandidate(input({ fx }));
    expect(result.action).toBe('WAIT');
    expect(result.candidates[0]?.costNvda).toBeNull();
  });

  it('skips genesis rounds, exhausted issuance, empty candidates, and zero marginal rewards', () => {
    expect(selectCandidate(input({ round: 143 })).action).toBe('SKIP');
    expect(selectCandidate(input({ round: 96 * 4320 })).action).toBe('SKIP');
    expect(selectCandidate(input({ candidates: [] })).action).toBe('SKIP');
    const saturated = selectCandidate(input({ ownWork: 10_777_023_386_140_748n, otherWorkScenarios: [0n] }));
    expect(saturated.action).toBe('SKIP');
    expect(saturated.candidates[0]?.rewardLow).toBe(0n);
  });

  it('rejects invalid conservation and pure-mining contribution candidates with explicit reasons', () => {
    const result = selectCandidate(input({ candidates: [
      candidate({ id: 'conservation', budget: 2n }),
      candidate({ id: 'work', work: 900_000_000_000_001n }),
      candidate({ id: 'zero', budget: 0n, paid: 0n, refund: 0n, work: 0n, gasWei: 0n, claimGasWei: 0n, serviceCostNvda: 0n }),
      candidate({ id: 'charged-zero', work: 0n }),
    ] }));
    expect(result.candidates.map(({ reason }) => reason)).toEqual([
      '预算不等于实付与退款之和', 'Work不能超过实付', '零候选不参与', '零Work候选不得收费',
    ]);
  });

  it('validates all structures before an absent FX can cause WAIT', () => {
    expect(() => selectCandidate(input({ fx: null, candidates: [candidate({ paid: -1n })] }))).toThrow(/bigint/);
    expect(() => selectCandidate(input({ candidates: [candidate(), candidate()] }))).toThrow(/唯一/);
    expect(() => selectCandidate(input({ fx: { numerator: 1n, denominator: 1n, observedAt: 1, maxAgeSeconds: 1, source: '' } }))).toThrow(/source/);
    expect(() => selectCandidate(input({ ownWork: 1 as unknown as bigint }))).toThrow(/bigint/);
  });

  it('does not mutate the input or candidate objects', () => {
    const original = input();
    const snapshot = structuredClone(original);
    selectCandidate(original);
    expect(original).toEqual(snapshot);
    expect(Object.prototype.hasOwnProperty.call(original.candidates[0], 'accepted')).toBe(false);
  });
});

describe('strategy runtime string boundaries', () => {
  it('is covered by dedicated PM acceptance tests in strategy.ts integration', async () => {
    const { validateStrategy } = await import('./strategy');
    const valid = { amount: '10', executions: 1, principalBudget: '10', gasBudget: '0', offset: 0, window: 1, slippageBps: 0, expiry: '2999-01-01', recipient: '0x1111111111111111111111111111111111111111' };
    for (const field of ['amount', 'principalBudget', 'gasBudget'] as const) {
      expect(validateStrategy({ ...valid, [field]: 0 as unknown as string })).not.toEqual([]);
      expect(validateStrategy({ ...valid, [field]: null as unknown as string })).not.toEqual([]);
    }
    expect(validateStrategy({ ...valid, expiry: {} as unknown as string })).not.toEqual([]);
    expect(validateStrategy({ ...valid, recipient: [] as unknown as string })).not.toEqual([]);
  });
});
