import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { children: ReactNode; scroll?: boolean; footer?: ReactNode; edges?: 'top' | 'none' };

/** Page container: background, padding, safe areas and an optional pinned footer (e.g. a Save button) */
export const Screen = ({ children, scroll = true, footer, edges = 'none' }: Props) => {
  const insets = useSafeAreaInsets();
  const content = <View className="gap-4 px-4 pb-8 pt-4">{children}</View>;
  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950" style={{ paddingTop: edges === 'top' ? insets.top : 0 }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          {content}
        </ScrollView>
      ) : (
        <View className="flex-1">{content}</View>
      )}
      {footer ? (
        <View
          className="border-t border-neutral-200 bg-neutral-50 px-4 pt-3 dark:border-neutral-800 dark:bg-neutral-950"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
};
