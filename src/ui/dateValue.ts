/** Convert between ISO dates and the local-midnight Date objects pickers use (never via UTC) */
export const isoToLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const localDateToIso = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-');

export type DateFieldProps = Readonly<{
  label: string;
  value: string; // ISO
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
}>;
