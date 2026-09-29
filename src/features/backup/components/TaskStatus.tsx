import { View } from 'react-native';
import { Banner } from '../../../ui/Banner';
import { ProgressBar } from '../../../ui/ProgressBar';
import { Muted } from '../../../ui/Text';
import type { TaskState } from '../useProgressTask';

export const TaskStatus = ({ task, working, doneTitle, doneText }: { task: TaskState; working: string; doneTitle: string; doneText?: string }) => (
  <>
    {task.running ? (
      <View className="gap-2">
        <ProgressBar value={task.progress} />
        <Muted>{working}</Muted>
      </View>
    ) : null}
    {task.error ? <Banner tone="danger" title={task.error} /> : null}
    {task.done ? <Banner title={doneTitle}>{doneText}</Banner> : null}
  </>
);
