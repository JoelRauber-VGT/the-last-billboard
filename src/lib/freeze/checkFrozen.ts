import { config } from '@/lib/config';

export function isBillboardFrozen(): boolean {
  return Date.now() >= config.billboardEndsAt.getTime();
}

export function throwIfFrozen(): void {
  if (isBillboardFrozen()) {
    throw new Error('Billboard is frozen. No more bids accepted.');
  }
}

export function getFreezeStatus() {
  const now = Date.now();
  const end = config.billboardEndsAt.getTime();
  const timeRemaining = end - now;

  return {
    isFrozen: timeRemaining <= 0,
    endsAt: config.billboardEndsAt,
    timeRemaining: Math.max(0, timeRemaining)
  };
}
