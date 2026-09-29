import { COUNTRIES } from './countries.data';

export type Country = Readonly<{ code: string; name: string; flag: string }>;

/** Flag emoji from regional-indicator letters ("FR" → 🇫🇷) */
export const flagOf = (code: string): string =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export const countries: readonly Country[] = COUNTRIES.map(([code, name]) => ({ code, name, flag: flagOf(code) }));

const byCode = new Map(countries.map((c) => [c.code, c]));

export const countryName = (code: string): string => byCode.get(code)?.name ?? code;

export const countryLabel = (code: string): string => `${flagOf(code)} ${countryName(code)}`;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Case- and accent-insensitive search. Ranks exact code, then name prefix, then anywhere in the name. */
export const searchCountries = (query: string, list: readonly Country[] = countries): readonly Country[] => {
  const q = fold(query.trim());
  if (!q) return list;
  const rank = (c: Country) => {
    const name = fold(c.name);
    return c.code.toLowerCase() === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : -1;
  };
  return list
    .map((c) => ({ c, r: rank(c) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r)
    .map(({ c }) => c);
};
