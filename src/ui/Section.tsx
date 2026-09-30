import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Overline } from './Text';

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View className="gap-2">
    <Overline className="px-1">{title}</Overline>
    <Card className="py-1">{children}</Card>
  </View>
);
