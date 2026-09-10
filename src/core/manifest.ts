export type TargetManifest = Readonly<{ chainId: string | null; token: string | null; hook: string | null; pool: string | null; router: string | null; abi: unknown[] | null; version: string | null; codeHash: string | null; deploymentBlock: bigint | null; enabled: boolean }>;
export const targetManifest: TargetManifest = { chainId: null, token: null, hook: null, pool: null, router: null, abi: null, version: null, codeHash: null, deploymentBlock: null, enabled: false };
export function transactionGate(manifest: TargetManifest, walletChainId: string | null): { allowed: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!manifest.enabled) reasons.push('Target deployment is disabled');
  if (!manifest.chainId || !manifest.token || !manifest.hook || !manifest.pool || !manifest.router || !manifest.abi || !manifest.version || !manifest.codeHash || manifest.deploymentBlock === null) reasons.push('Target deployment is unverified or incomplete');
  if (walletChainId !== null && manifest.chainId !== walletChainId) reasons.push('Wallet is on the wrong chain');
  return { allowed: false, reasons };
}
