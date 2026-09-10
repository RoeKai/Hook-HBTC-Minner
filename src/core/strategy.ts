export type StrategyState = 'DRAFT'|'VALIDATING'|'READY'|'RUNNING_SIMULATION'|'PAUSED'|'EXPIRED';
export type StrategyError = 'STALE_DATA'|'WRONG_CHAIN'|'INVALID_CONFIG'|'INSUFFICIENT_BALANCE';
const transitions: Record<StrategyState, StrategyState[]> = { DRAFT:['VALIDATING'], VALIDATING:['DRAFT','READY'], READY:['RUNNING_SIMULATION','EXPIRED'], RUNNING_SIMULATION:['PAUSED','EXPIRED'], PAUSED:['RUNNING_SIMULATION','EXPIRED'], EXPIRED:[] };
export function transition(from: StrategyState, to: StrategyState): StrategyState { if (!transitions[from].includes(to)) throw new Error(`Illegal transition: ${from} -> ${to}`); return to; }
export type WindowResult = 'WAIT'|'EXECUTE'|'SKIP'|'STALE_DATA';
export function executionWindow(input: { now: number; blockStart: number; blockDuration: number; offset: number; window: number; observedAt: number; staleAfter?: number }): WindowResult {
  const {now,blockStart,blockDuration,offset,window,observedAt,staleAfter=30} = input;
  if (offset < 0 || offset >= blockDuration || window <= 0 || offset + window > blockDuration) throw new Error('Invalid execution window');
  if (now - observedAt > staleAfter) return 'STALE_DATA';
  if (now < blockStart + offset) return 'WAIT';
  if (now >= blockStart + offset + window) return 'SKIP';
  return 'EXECUTE';
}
export interface StrategyConfig { amount: string; executions: number; principalBudget: string; gasBudget: string; offset: number; window: number; slippageBps: number; expiry: string; recipient: string; }
export function validateStrategy(s: StrategyConfig): string[] { const errors=[]; try { const a=BigInt(s.amount), p=BigInt(s.principalBudget), g=BigInt(s.gasBudget); if(a<=0n||p<a*BigInt(s.executions)||g<0n) errors.push('Budgets must cover all executions'); } catch { errors.push('Amounts must be integer smallest units'); } if(!Number.isInteger(s.executions)||s.executions<1) errors.push('Executions must be positive'); if(s.offset<0||s.offset>=600||s.window<1||s.offset+s.window>600) errors.push('Window must fit the 600 second cycle'); if(s.slippageBps<0||s.slippageBps>10000) errors.push('Slippage must be 0–10000 bps'); if(!/^0x[a-fA-F0-9]{40}$/.test(s.recipient)) errors.push('Recipient must be an address'); if(!s.expiry||Date.parse(s.expiry)<=Date.now()) errors.push('Expiry must be in the future'); return errors; }
