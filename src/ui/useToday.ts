import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localToday, type DayNum } from '../domain/days';

/** Today's date, refreshed when the app returns to the foreground (e.g. the next morning) */
export const useToday = (): DayNum => {
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setToday(localToday()));
    return () => sub.remove();
  }, []);
  return today;
};
