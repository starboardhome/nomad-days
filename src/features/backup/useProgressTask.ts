import { useState } from 'react';
import { BackupError, type Progress } from '../../backup/envelope';

export type TaskState = Readonly<{ running: boolean; progress: number; error?: string; done: boolean }>;

const messageOf = (e: unknown) => (e instanceof BackupError || e instanceof Error ? e.message : String(e));

/** Runs a slow key-derivation task, exposing progress (0–1), errors and completion */
export const useProgressTask = () => {
  const [state, setState] = useState<TaskState>({ running: false, progress: 0, done: false });
  const onProgress: Progress = (progress) => setState((s) => ({ ...s, progress }));

  const run = async (task: (onProgress: Progress) => Promise<unknown>) => {
    setState({ running: true, progress: 0, done: false });
    try {
      await task(onProgress);
      setState({ running: false, progress: 1, done: true });
      return true;
    } catch (e) {
      setState({ running: false, progress: 0, done: false, error: messageOf(e) });
      return false;
    }
  };
  return { ...state, run };
};
