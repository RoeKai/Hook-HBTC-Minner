import type { Amount } from './amount';
export type Datum<T> = Readonly<{ value: T | null; source: string; observedAt: string }>;
export interface ProtocolSnapshot { blockIndex: Datum<bigint>; progressBps: Datum<number>; remainingSeconds: Datum<number>; toll: Datum<Amount>; totalWork: Datum<bigint>; userWork: Datum<bigint>; projectedReward: Datum<Amount>; claimableReward: Datum<Amount>; claimedReward: Datum<Amount>; purchasedToken: Datum<Amount>; nativeBalance: Datum<Amount>; tokenBalance: Datum<Amount>; principalSpent: Datum<Amount>; gasSpent: Datum<Amount>; }
export interface ReadonlyProtocolAdapter { getSnapshot(account: string | null): Promise<ProtocolSnapshot>; }
