/** Include both observations and the complete target band with breathing room. */
export function getChartDomain(values: number[], targetMin?: number | null, targetMax?: number | null): [number, number] {
  const bounds = [...values, targetMin, targetMax].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!bounds.length) return [0, 100];
  const min = Math.min(...bounds);
  const max = Math.max(...bounds);
  const padding = Math.max((max - min) * 0.12, 1);
  return [Math.floor(min - padding), Math.ceil(max + padding)];
}
