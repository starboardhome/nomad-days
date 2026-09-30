import { router } from 'expo-router';
import { useState } from 'react';
import { exportBackup } from '../../backup/files';
import { PassphraseFields, passphraseIssue } from '../../features/backup/components/PassphraseFields';
import { TaskStatus } from '../../features/backup/components/TaskStatus';
import { useProgressTask } from '../../features/backup/useProgressTask';
import { useApp } from '../../state/appStore';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Body } from '../../ui/Text';

export default function ExportBackupScreen() {
  const store = useApp((s) => s.store);
  const [pass, setPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const task = useProgressTask();
  const issue = passphraseIssue(pass, repeat);

  const onExport = () => store && task.run((onProgress) => exportBackup(store, pass, onProgress));

  return (
    <Screen
      footer={
        task.done ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : (
          <Button label="Encrypt & share" onPress={onExport} disabled={!!issue} loading={task.running} />
        )
      }
    >
      <Body>
        Creates one encrypted file with your profile and trips. Save it somewhere safe, like Files, iCloud Drive, a
        USB stick or an email to yourself.
      </Body>
      <Banner tone="warn" title="There’s no way to recover a forgotten passphrase">
        Without it, nobody can open the backup, including you. Write it down somewhere safe.
      </Banner>
      <Card className="gap-4">
        <PassphraseFields value={pass} onChange={setPass} confirmValue={repeat} onConfirmChange={setRepeat} />
      </Card>
      {pass && issue ? <Banner tone="warn" title={issue} /> : null}
      <TaskStatus task={task} working="Encrypting… this takes a few seconds." doneTitle="Backup created" doneText="If you didn't save it, run the export again." />
    </Screen>
  );
}
