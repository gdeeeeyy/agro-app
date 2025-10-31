export function formatBilingualDate(dateStr: string | number | Date) {
  const d = new Date(dateStr);
  const en = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const ta = d.toLocaleDateString('ta-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${en} / ${ta}`;
}
