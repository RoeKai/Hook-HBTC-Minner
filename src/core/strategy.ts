export type StrategyState = 'DRAFT'|'VALIDATING'|'READY'|'RUNNING_SIMULATION'|'PAUSED'|'EXPIRED';
export type StrategyError = 'STALE_DATA'|'WRONG_CHAIN'|'INVALID_CONFIG'|'INSUFFICIENT_BALANCE';
const transitions: Record<StrategyState, StrategyState[]> = { DRAFT:['VALIDATING'], VALIDATING:['DRAFT','READY'], READY:['RUNNING_SIMULATION','EXPIRED'], RUNNING_SIMULATION:['PAUSED','EXPIRED'], PAUSED:['RUNNING_SIMULATION','EXPIRED'], EXPIRED:[] };
export function transition(from: StrategyState, to: StrategyState): StrategyState { if (!transitions[from].includes(to)) throw new Error(`Illegal transition: ${from} -> ${to}`); return to; }
export type WindowResult = 'WAIT'|'EXECUTE'|'SKIP'|'STALE_DATA';
export function executionWindow(input: { now: number; blockStart: number; blockDuration: number; offset: number; window: number; observedAt: number; staleAfter?: number }): WindowResult {
  const {now,blockStart,blockDuration,offset,window,observedAt,staleAfter=30} = input;
  const values = [now, blockStart, blockDuration, offset, window, observedAt, staleAfter];
  if (!values.every(Number.isSafeInteger)) throw new Error('Window values must be finite safe integers');
  if (now < 0 || blockStart < 0 || observedAt < 0 || blockDuration <= 0 || staleAfter < 0) throw new Error('Invalid window timing');
  if (observedAt > now) throw new Error('Observation cannot be in the future');
  if (offset < 0 || offset >= blockDuration || window <= 0 || offset > blockDuration - window) throw new Error('Invalid execution window');
  if (blockStart > Number.MAX_SAFE_INTEGER - offset || blockStart + offset > Number.MAX_SAFE_INTEGER - window) throw new Error('Execution window overflows');
  if (now - observedAt > staleAfter) return 'STALE_DATA';
  if (now < blockStart + offset) return 'WAIT';
  if (now >= blockStart + offset + window) return 'SKIP';
  return 'EXECUTE';
}
export interface StrategyConfig { amount: string; executions: number; principalBudget: string; gasBudget: string; offset: number; window: number; slippageBps: number; expiry: string; recipient: string; }
export function validateStrategy(s: StrategyConfig, now = Date.now()): string[] {
  const errors: string[] = [];
  const integerAmount = /^(0|[1-9]\d*)$/;
  const amountsValid = [s.amount, s.principalBudget, s.gasBudget].every((value) => integerAmount.test(value));
  const executionsValid = Number.isSafeInteger(s.executions) && s.executions >= 1;

  if (!amountsValid) {
    errors.push('Amounts must be canonical decimal smallest units');
  } else {
    const amount = BigInt(s.amount);
    const principal = BigInt(s.principalBudget);
    const gas = BigInt(s.gasBudget);
    if (amount <= 0n || (executionsValid && principal < amount * BigInt(s.executions)) || gas < 0n) errors.push('Budgets must cover all executions');
  }
  if (!executionsValid) errors.push('Executions must be a positive safe integer');
  if (!Number.isSafeInteger(s.offset) || !Number.isSafeInteger(s.window) || s.offset < 0 || s.offset >= 600 || s.window < 1 || s.offset > 600 - s.window) errors.push('Window must fit the 600 second cycle');
  if (!Number.isSafeInteger(s.slippageBps) || s.slippageBps < 0 || s.slippageBps > 10000) errors.push('Slippage must be an integer from 0–10000 bps');
  if (!/^0x[a-fA-F0-9]{40}$/.test(s.recipient)) errors.push('Recipient must be an address');
  const expiry = Date.parse(s.expiry);
  if (!Number.isFinite(expiry) || !Number.isFinite(now) || expiry <= now) errors.push('Expiry must be a valid future date');
  return errors;
}
