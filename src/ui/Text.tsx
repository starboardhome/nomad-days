import type { ReactNode } from 'react';
import { Text as RNText, type TextProps } from 'react-native';

type Props = TextProps & { children: ReactNode; className?: string };

const make =
  (base: string) =>
  ({ className = '', ...rest }: Props) => <RNText className={`${base} ${className}`} {...rest} />;

export const Title = make('text-3xl font-bold text-neutral-900 dark:text-neutral-50');
export const Heading = make('text-lg font-semibold text-neutral-900 dark:text-neutral-50');
export const Body = make('text-base text-neutral-800 dark:text-neutral-200');
export const Muted = make('text-sm text-neutral-500 dark:text-neutral-400');
export const Overline = make('text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400');
