import type { Candidate } from './accumulation';

export interface PreviewCandidateInput {
  maxBudget: bigint;
  target: bigint;
  ownWork: bigint;
  otherWorkScenarios: readonly bigint[];
  gasWei: bigint;
  claimGasWei: bigint;
  serviceCostNvda: bigint;
}

const PAID_NUMERATOR = 995n;
const PAID_DENOMINATOR = 1000n;

function requireAmount(value: unknown, name: string): asserts value is bigint {
  if (typeof value !== 'bigint' || value < 0n) throw new TypeError(`${name}必须是非负bigint`);
}

function minimumBudgetForWork(work: bigint): bigint {
  return (work * PAID_DENOMINATOR + PAID_NUMERATOR - 1n) / PAID_NUMERATOR;
}

/** Builds a bounded heuristic set for the documented offline 99.5% work adapter. */
export function generatePreviewCandidates(input: PreviewCandidateInput): Candidate[] {
  requireAmount(input.maxBudget, 'maxBudget');
  requireAmount(input.target, 'target');
  requireAmount(input.ownWork, 'ownWork');
  requireAmount(input.gasWei, 'gasWei');
  requireAmount(input.claimGasWei, 'claimGasWei');
  requireAmount(input.serviceCostNvda, 'serviceCostNvda');
  if (!Array.isArray(input.otherWorkScenarios) || input.otherWorkScenarios.length === 0 || input.otherWorkScenarios.length > 32) {
    throw new TypeError('竞争情景数量必须为1至32');
  }
  for (let index = 0; index < input.otherWorkScenarios.length; index += 1) {
    requireAmount(input.otherWorkScenarios[index], `otherWorkScenarios[${index}]`);
  }

  const critical = new Set<bigint>([0n]);
  const addWithNeighbours = (budget: bigint) => {
    for (const value of [budget - 1n, budget, budget + 1n]) {
      if (value >= 0n && value <= input.maxBudget) critical.add(value);
    }
  };
  if (input.maxBudget > 0n) addWithNeighbours(minimumBudgetForWork(1n));
  for (const other of input.otherWorkScenarios) {
    const occupied = input.ownWork + other;
    if (input.target > occupied) addWithNeighbours(minimumBudgetForWork(input.target - occupied));
  }
  addWithNeighbours(input.maxBudget);

  const grid: bigint[] = [];
  for (let part = 1n; part <= 8n; part += 1n) grid.push(input.maxBudget * part / 8n);
  const amounts = [...critical];
  for (const value of grid) {
    if (amounts.length >= 24) break;
    if (!critical.has(value)) amounts.push(value);
  }
  amounts.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

  return amounts.map((budget) => {
    if (budget === 0n) return {
      id: 'budget-0', budget, paid: 0n, refund: 0n, work: 0n,
      gasWei: 0n, claimGasWei: 0n, serviceCostNvda: 0n,
    };
    const paid = budget * PAID_NUMERATOR / PAID_DENOMINATOR;
    return {
      id: `budget-${budget}`, budget, paid, refund: budget - paid, work: paid,
      gasWei: input.gasWei, claimGasWei: input.claimGasWei,
      serviceCostNvda: input.serviceCostNvda,
    };
  });
}
