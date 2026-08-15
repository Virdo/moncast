export const MIN_STAKE_USDC = 1;
export const MAX_STAKE_USDC = 1_000_000;
export const USDC_UNIT = 1_000_000n;

export function validStakeAmount(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= MIN_STAKE_USDC
    && value <= MAX_STAKE_USDC;
}

export function stakeAmountUnits(value: number) {
  if (!validStakeAmount(value)) {
    throw new Error(`单人保证金必须是 ${MIN_STAKE_USDC}–${MAX_STAKE_USDC.toLocaleString()} USDC 的整数。`);
  }
  return BigInt(value) * USDC_UNIT;
}
