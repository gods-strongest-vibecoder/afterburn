// Utility helpers for deterministic rendering
// Seeded random - MUST use this, not Math.random() (Remotion requires deterministic renders)
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};
