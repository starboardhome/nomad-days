import { Alert, Platform } from 'react-native';

/** Destructive-action confirmation that also works in the web preview */
export const confirm = (title: string, message: string, action: string): Promise<boolean> =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false)
    : new Promise((resolve) =>
        Alert.alert(title, message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: action, style: 'destructive', onPress: () => resolve(true) },
        ]),
      );
