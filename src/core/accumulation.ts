const TOKEN_SCALE = 10n ** 18n;
const TOTAL_EMISSION = 21_000_000n * TOKEN_SCALE;
const ROUNDS_PER_EPOCH = 4320;
const INITIAL_TARGET = 10_777_023_386_140_748n;

export interface Candidate {
  id: string;
  budget: bigint;
  paid: bigint;
  refund: bigint;
  work: bigint;
  gasWei: bigint;
  claimGasWei: bigint;
  serviceCostNvda: bigint;
}

export interface FxRate {
  numerator: bigint;
  denominator: bigint;
  observedAt: number;
  maxAgeSeconds: number;
  source: string;
}

export interface DecisionInput {
  round: number;
  ownWork: bigint;
  otherWorkScenarios: readonly bigint[];
  nvdaAvailable: bigint;
  ethAvailable: bigint;
  perRoundCap: bigint;
  dailyRemaining: bigint;
  nvdaReserved: bigint;
  ethReserved: bigint;
  nvdaFeeReserve: bigint;
  ethExitReserve: bigint;
  costPerThousandCap: bigint;
  now: number;
  fx: null | FxRate;
  candidates: readonly Candidate[];
}

export interface EvaluatedCandidate extends Candidate {
  accepted: boolean;
  reason: string;
  rewardLow: bigint;
  rewardHigh: bigint;
  costNvda: bigint | null;
  costPerThousand: bigint | null;
}

export interface Decision {
  action: 'PARTICIPATE' | 'WAIT' | 'SKIP';
  reason: string;
  selected: EvaluatedCandidate | null;
  candidates: EvaluatedCandidate[];
  assumptions: string[];
}

export function explainUnselected(candidate: EvaluatedCandidate, selected: EvaluatedCandidate): string {
  if (!candidate.accepted) return candidate.reason;
  if (candidate.rewardLow < selected.rewardLow) return '合格但未选：保守新增币数较少';
  if (candidate.costNvda! > selected.costNvda!) return '合格但未选：同币数综合成本更高';
  if (candidate.budget > selected.budget) return '合格但未选：同币数同成本但预算更高';
  return '合格但未选：稳定 ID 平局排序靠后';
}

const assumptions = [
  '竞争值来自离散情景，不是奖励保证。',
  '预算是支出上限，不要求全部用完。',
  '当前轮奖励尚未最终确认。',
  '本次仅比较给定候选，不声称跨轮全局最优。',
];

function safeInteger(value: unknown, name: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new TypeError(`${name}必须是非负安全整数`);
}

function amount(value: unknown, name: string): asserts value is bigint {
  if (typeof value !== 'bigint' || value < 0n) throw new TypeError(`${name}必须是非负bigint`);
}

function record(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${name}结构无效`);
}

export function emissionAt(round: number): { epoch: number; public: boolean; scheduled: bigint; target: bigint } {
  safeInteger(round, 'round');
  const epoch = Math.floor(round / ROUNDS_PER_EPOCH);
  const scheduled = epoch >= 96 ? 0n : (TOTAL_EMISSION >> BigInt(epoch + 1)) / BigInt(ROUNDS_PER_EPOCH);
  const target = epoch >= 256 ? 0n : INITIAL_TARGET >> BigInt(epoch);
  return { epoch, public: round >= 144, scheduled, target };
}

export function rewardAt(scheduled: bigint, target: bigint, own: bigint, other: bigint): bigint {
  amount(scheduled, 'scheduled');
  amount(target, 'target');
  amount(own, 'own');
  amount(other, 'other');
  if (own === 0n) return 0n;
  const total = other + own;
  return scheduled * own / (target > total ? target : total);
}

export function marginalRewards(
  scheduled: bigint,
  target: bigint,
  own: bigint,
  added: bigint,
  others: readonly bigint[],
): { low: bigint; high: bigint; values: bigint[] } {
  amount(scheduled, 'scheduled');
  amount(target, 'target');
  amount(own, 'own');
  amount(added, 'added');
  if (!Array.isArray(others) || others.length === 0 || others.length > 32) throw new TypeError('竞争情景数量必须为1至32');
  const values: bigint[] = [];
  for (let index = 0; index < others.length; index += 1) {
    const other = others[index];
    amount(other, `others[${index}]`);
    values.push(rewardAt(scheduled, target, own + added, other) - rewardAt(scheduled, target, own, other));
  }
  let low = values[0]!;
  let high = values[0]!;
  for (const value of values.slice(1)) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return { low, high, values };
}

function validateInput(input: DecisionInput): void {
  record(input, 'input');
  safeInteger(input.round, 'round');
  safeInteger(input.now, 'now');
  const fields = ['ownWork', 'nvdaAvailable', 'ethAvailable', 'perRoundCap', 'dailyRemaining', 'nvdaReserved',
    'ethReserved', 'nvdaFeeReserve', 'ethExitReserve', 'costPerThousandCap'] as const;
  for (const field of fields) amount(input[field], field);
  if (!Array.isArray(input.otherWorkScenarios) || input.otherWorkScenarios.length === 0 || input.otherWorkScenarios.length > 32) {
    throw new TypeError('竞争情景数量必须为1至32');
  }
  for (let index = 0; index < input.otherWorkScenarios.length; index += 1) {
    amount(input.otherWorkScenarios[index], `otherWorkScenarios[${index}]`);
  }
  if (!Array.isArray(input.candidates) || input.candidates.length > 64) throw new TypeError('候选数组最多64项');
  const ids = new Set<string>();
  for (let index = 0; index < input.candidates.length; index += 1) {
    const candidate = input.candidates[index];
    record(candidate, `candidates[${index}]`);
    if (typeof candidate.id !== 'string' || candidate.id.trim() === '' || ids.has(candidate.id)) throw new TypeError('候选ID必须非空且唯一');
    ids.add(candidate.id);
    const candidateFields = ['budget', 'paid', 'refund', 'work', 'gasWei', 'claimGasWei', 'serviceCostNvda'] as const;
    for (const field of candidateFields) amount(candidate[field], `candidates[${index}].${field}`);
  }
  if (input.fx !== null) {
    record(input.fx, 'fx');
    amount(input.fx.numerator, 'fx.numerator');
    amount(input.fx.denominator, 'fx.denominator');
    safeInteger(input.fx.observedAt, 'fx.observedAt');
    safeInteger(input.fx.maxAgeSeconds, 'fx.maxAgeSeconds');
    if (typeof input.fx.source !== 'string' || input.fx.source.trim() === '') throw new TypeError('fx.source必须非空');
  }
}

function fxUnavailable(input: DecisionInput): boolean {
  const fx = input.fx;
  return fx === null || fx.numerator === 0n || fx.denominator === 0n || fx.observedAt > input.now || input.now - fx.observedAt > fx.maxAgeSeconds;
}

function rejected(candidate: Candidate, reason: string): EvaluatedCandidate {
  return { ...candidate, accepted: false, reason, rewardLow: 0n, rewardHigh: 0n, costNvda: null, costPerThousand: null };
}

export function selectCandidate(input: DecisionInput): Decision {
  validateInput(input);
  const emission = emissionAt(input.round);
  const unknownFx = fxUnavailable(input);
  const evaluated = input.candidates.map((candidate): EvaluatedCandidate => {
    if (candidate.budget !== candidate.paid + candidate.refund) return rejected(candidate, '预算不等于实付与退款之和');
    if (candidate.work === 0n) {
      const charges = candidate.paid + candidate.refund + candidate.budget + candidate.gasWei + candidate.claimGasWei + candidate.serviceCostNvda;
      return rejected(candidate, charges === 0n ? '零候选不参与' : '零Work候选不得收费');
    }
    if (candidate.work > candidate.paid) return rejected(candidate, 'Work不能超过实付');
    if (candidate.paid === 0n || candidate.budget === 0n) return rejected(candidate, '正Work必须有正实付和预算');
    if (candidate.budget > input.perRoundCap) return rejected(candidate, '超过单轮预算上限');
    if (candidate.budget + candidate.serviceCostNvda + input.nvdaReserved + input.nvdaFeeReserve > input.nvdaAvailable) return rejected(candidate, 'NVDA余额或预留不足');
    if (candidate.paid + candidate.serviceCostNvda > input.dailyRemaining) return rejected(candidate, '超过每日剩余额度');
    if (candidate.gasWei + candidate.claimGasWei + input.ethReserved + input.ethExitReserve > input.ethAvailable) return rejected(candidate, 'ETH费用余额或预留不足');
    if (!emission.public) return rejected(candidate, '创世轮尚不可公开参与');
    if (emission.scheduled === 0n) return rejected(candidate, '当前轮没有计划发行');
    const rewards = marginalRewards(emission.scheduled, emission.target, input.ownWork, candidate.work, input.otherWorkScenarios);
    if (rewards.low <= 0n) return { ...rejected(candidate, '保守情景无正新增奖励'), rewardLow: rewards.low, rewardHigh: rewards.high };
    if (unknownFx) return { ...rejected(candidate, '汇率缺失、非正、过期或来自未来'), rewardLow: rewards.low, rewardHigh: rewards.high };
    const fx = input.fx!;
    const gas = candidate.gasWei + candidate.claimGasWei;
    const gasNvda = (gas * fx.numerator + fx.denominator - 1n) / fx.denominator;
    const costNvda = candidate.paid + candidate.serviceCostNvda + gasNvda;
    const scaledCost = costNvda * 1000n * TOKEN_SCALE;
    const costPerThousand = (scaledCost + rewards.low - 1n) / rewards.low;
    if (scaledCost > input.costPerThousandCap * rewards.low) {
      return { ...candidate, accepted: false, reason: '本次每千枚综合成本超过上限', rewardLow: rewards.low, rewardHigh: rewards.high, costNvda, costPerThousand };
    }
    return { ...candidate, accepted: true, reason: '通过预算与本次成本约束', rewardLow: rewards.low, rewardHigh: rewards.high, costNvda, costPerThousand };
  });

  if (!emission.public) return { action: 'SKIP', reason: '第0至143轮为创世轮，暂不参与', selected: null, candidates: evaluated, assumptions: [...assumptions] };
  if (emission.scheduled === 0n) return { action: 'SKIP', reason: '当前轮没有计划发行', selected: null, candidates: evaluated, assumptions: [...assumptions] };
  if (unknownFx) return { action: 'WAIT', reason: '必要Gas汇率未知，等待有效报价', selected: null, candidates: evaluated, assumptions: [...assumptions] };
  let selected: EvaluatedCandidate | null = null;
  for (const candidate of evaluated) {
    if (!candidate.accepted) continue;
    if (selected === null || candidate.rewardLow > selected.rewardLow
      || (candidate.rewardLow === selected.rewardLow && candidate.costNvda! < selected.costNvda!)
      || (candidate.rewardLow === selected.rewardLow && candidate.costNvda === selected.costNvda && candidate.budget < selected.budget)
      || (candidate.rewardLow === selected.rewardLow && candidate.costNvda === selected.costNvda && candidate.budget === selected.budget && candidate.id < selected.id)) {
      selected = candidate;
    }
  }
  if (selected === null) return { action: 'SKIP', reason: input.candidates.length === 0 ? '没有候选方案' : '没有符合预算与正新增获币量要求的候选', selected: null, candidates: evaluated, assumptions: [...assumptions] };
  return { action: 'PARTICIPATE', reason: '选择保守新增奖励最多的合格候选', selected, candidates: evaluated, assumptions: [...assumptions] };
}
