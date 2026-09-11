import { describe, expect, it } from 'vitest';
import { emissionAt, selectCandidate } from './accumulation';
import { generatePreviewCandidates } from './accumulation-preview';

const fees = { gasWei: 2_000_000_000_000n, claimGasWei: 1_000_000_000_000n, serviceCostNvda: 1_000_000_000_000n };

describe('preview candidate generation', () => {
  const target = emissionAt(144).target;

  it.each([
    ['普通', [0n, target / 2n]], ['高竞争', [4n * target, 8n * target]], ['晚加入', [0n, 4n * target]],
  ])('creates a dense, bounded deterministic set for %s scenarios', (_name, others) => {
    const result = generatePreviewCandidates({ maxBudget: target * 2n, target, ownWork: 0n, otherWorkScenarios: others, ...fees });
    expect(result.length).toBeLessThanOrEqual(24);
    expect(new Set(result.map(({ id }) => id)).size).toBe(result.length);
    expect(result[0]?.budget).toBe(0n);
    expect(result.at(-1)?.budget).toBe(target * 2n);
  });

  it('uses the integer adapter inverse and preserves exact reach neighbours', () => {
    const requiredWork = target / 2n;
    const requiredBudget = (requiredWork * 1000n + 994n) / 995n;
    const result = generatePreviewCandidates({ maxBudget: requiredBudget + 1n, target, ownWork: 0n, otherWorkScenarios: [target / 2n], ...fees });
    const budgets = result.map(({ budget }) => budget);
    expect(budgets).toEqual(expect.arrayContaining([requiredBudget - 1n, requiredBudget, requiredBudget + 1n]));
    expect(result.find(({ budget }) => budget === requiredBudget - 1n)?.work).toBeLessThan(requiredWork);
    expect(result.find(({ budget }) => budget === requiredBudget)?.work).toBeGreaterThanOrEqual(requiredWork);
  });

  it('does not substitute budget=1 for the minimum positive-work budget', () => {
    const result = generatePreviewCandidates({ maxBudget: 1n, target, ownWork: 0n, otherWorkScenarios: [0n], ...fees });
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ budget: 1n, paid: 0n, work: 0n });
  });

  it('finds the PM cost-cap counterexample through the actual selector', () => {
    const maxBudget = 5_415_589_641_276_758n;
    const scenarios = [0n, target / 2n];
    const candidates = generatePreviewCandidates({ maxBudget, target, ownWork: 0n, otherWorkScenarios: scenarios, ...fees });
    const result = selectCandidate({
      round: 144, ownWork: 0n, otherWorkScenarios: scenarios,
      nvdaAvailable: maxBudget + fees.serviceCostNvda, ethAvailable: 3_000_000_000_000n,
      perRoundCap: maxBudget, dailyRemaining: maxBudget, nvdaReserved: 0n, ethReserved: 0n,
      nvdaFeeReserve: 0n, ethExitReserve: 0n, costPerThousandCap: 5_000_000_000_000_000n,
      now: 1000, fx: { numerator: 1n, denominator: 1n, observedAt: 1000, maxAgeSeconds: 30, source: '演示' }, candidates,
    });
    expect(result.action).toBe('PARTICIPATE');
    expect(result.selected).toMatchObject({ budget: maxBudget, paid: 5_388_511_693_070_374n, work: 5_388_511_693_070_374n, refund: 27_077_948_206_384n, costNvda: 5_392_511_693_070_374n });
    expect(result.selected!.costPerThousand).toBeLessThanOrEqual(5_000_000_000_000_000n);
  });
});
