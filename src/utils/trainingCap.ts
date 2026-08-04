/**
 * Maximum value a trainable base stat can reach at a given character level.
 * Levels 1-40 share a flat cap of 200; above that it scales at level * 5.
 */
export function getTrainingCap(level: number): number {
  return level <= 40 ? 200 : level * 5;
}
