import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body } from '../../../ui/Text';
import { SOURCES, type Info } from '../content';

/** Full explanation for one question, in a sheet */
export const InfoSheet = ({ info, visible, onClose }: { info: Info; visible: boolean; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
          <Text className="flex-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">{info.title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" className="px-2 py-1">
            <Text className="text-base font-semibold text-brand dark:text-brand-dark">Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-3 px-4 pb-8">
          {info.paragraphs.map((p) => (
            <Body key={p}>{p}</Body>
          ))}
          <View className="gap-2 pt-2">
            {SOURCES.map((s) => (
              <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} accessibilityRole="link">
                <Text className="text-sm font-medium text-brand underline dark:text-brand-dark">{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

/** ⓘ button that opens the explanation */
export const InfoButton = ({ info }: { info: Info }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`About: ${info.title}`} hitSlop={10}>
        <Ionicons name="information-circle-outline" size={24} color="#0F766E" />
      </Pressable>
      <InfoSheet info={info} visible={open} onClose={() => setOpen(false)} />
    </>
  );
};
