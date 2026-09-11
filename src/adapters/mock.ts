import type { ReadonlyProtocolAdapter, ProtocolSnapshot, Datum } from '../core/protocol';
const now = () => new Date().toISOString();
const d = <T>(value: T | null): Datum<T> => ({ value, source: 'R1 deterministic simulation', observedAt: now() });
const amount = (value: bigint, symbol: string) => ({ value, decimals: 18, symbol });
export class MockProtocolAdapter implements ReadonlyProtocolAdapter {
  async getSnapshot(account: string | null): Promise<ProtocolSnapshot> {
    return { blockIndex:d(1842n), progressBps:d(6375), remainingSeconds:d(217), toll:d(amount(3000000000000000n,'ETH')), totalWork:d(998120n), userWork:d(account ? 12480n : null), projectedReward:d(account ? amount(1250340000000000000n,'COPY') : null), claimableReward:d(account ? amount(482000000000000000n,'COPY') : null), claimedReward:d(account ? amount(830000000000000000n,'COPY') : null), purchasedToken:d(account ? amount(18750000000000000000n,'COPY') : null), nativeBalance:d(account ? amount(2450000000000000000n,'ETH') : null), tokenBalance:d(account ? amount(20480000000000000000n,'COPY') : null), principalSpent:d(amount(750000000000000000n,'ETH')), gasSpent:d(amount(8400000000000000n,'ETH')) };
  }
}
