export type Amount = Readonly<{ value: bigint; decimals: number; symbol: string }>;

export function parseAmount(input: string, decimals: number, symbol = 'TOKEN'): Amount {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid decimals');
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(input)) throw new Error('Invalid non-negative amount');
  const [whole = '0', fraction = ''] = input.split('.');
  if (fraction.length > decimals) throw new Error('Amount exceeds token precision');
  return { value: BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0'), decimals, symbol };
}

export function formatAmount(amount: Amount | null, maxFraction?: number): string {
  if (amount === null) return 'Unknown';
  if (!Number.isSafeInteger(amount.decimals) || amount.decimals < 0 || amount.decimals > 255) throw new Error('Invalid decimals');
  const fractionLimit = maxFraction ?? Math.min(4, amount.decimals);
  if (!Number.isSafeInteger(fractionLimit) || fractionLimit < 0 || fractionLimit > amount.decimals) throw new Error('Invalid maximum fraction');
  if (amount.value < 0n) throw new Error('Invalid negative amount');
  const scale = 10n ** BigInt(amount.decimals);
  const whole = amount.value / scale;
  const fullFraction = (amount.value % scale).toString().padStart(amount.decimals, '0');
  let fraction = fullFraction.slice(0, fractionLimit).replace(/0+$/, '');
  // Never render a positive value as exact zero merely because display precision
  // is smaller than the token precision.
  if (amount.value > 0n && whole === 0n && !fraction) fraction = fullFraction.replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} ${amount.symbol}`;
}

export function projectedReward(scheduled: bigint, targetWork: bigint, userWork: bigint, totalWork: bigint): bigint {
  if ([scheduled, targetWork, userWork, totalWork].some((v) => v < 0n)) throw new Error('Negative values are invalid');
  if (userWork === 0n || totalWork === 0n) return 0n;
  const denominator = totalWork > targetWork ? totalWork : targetWork;
  return scheduled * userWork / denominator;
}
