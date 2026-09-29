import { router } from 'expo-router';
import { Fragment } from 'react';
import type { StayRecord } from '../../../data/schema';
import type { DayNum } from '../../../domain/days';
import { Card } from '../../../ui/Card';
import { Divider, Row } from '../../../ui/Row';
import { Text, View } from 'react-native';
import { tripRow } from '../model';

const HereNow = () => (
  <View className="rounded-full bg-brand-soft px-2.5 py-0.5 dark:bg-teal-950">
    <Text className="text-xs font-bold text-brand dark:text-brand-dark">Here now</Text>
  </View>
);

export const TripList = ({ stays, today }: { stays: readonly StayRecord[]; today: DayNum }) => (
  <Card className="py-1">
    {stays.map((s, i) => {
      const row = tripRow(s, today);
      return (
        <Fragment key={row.id}>
          {i > 0 ? <Divider /> : null}
          <Row
            title={row.title}
            subtitle={row.subtitle}
            right={row.ongoing ? <HereNow /> : undefined}
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: row.id } })}
          />
        </Fragment>
      );
    })}
  </Card>
);
