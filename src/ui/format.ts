const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-19" → "19 Oct 2026" (locale-independent, so it reads the same everywhere) */
export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** "2026-06-01" → "1 Jun" (omits the year if it's the current year) */
export const formatShortDate = (iso: string, currentYear: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return y === currentYear ? `${d} ${MONTHS[m - 1]}` : `${d} ${MONTHS[m - 1]} ${y}`;
};

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Number of days in an inclusive ISO date range */
export const daysInclusive = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000) + 1;
