import { router } from 'expo-router';
import { useState } from 'react';
import { pickBackupFile, restoreBackup } from '../../backup/files';
import { PassphraseFields, passphraseIssue } from '../../features/backup/components/PassphraseFields';
import { TaskStatus } from '../../features/backup/components/TaskStatus';
import { useProgressTask } from '../../features/backup/useProgressTask';
import { useApp } from '../../state/appStore';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { confirm } from '../../ui/confirm';
import { Screen } from '../../ui/Screen';
import { Body } from '../../ui/Text';

export default function RestoreBackupScreen() {
  const { store, reload, dismissReset } = useApp();
  const [file, setFile] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string>();
  const [pass, setPass] = useState('');
  const task = useProgressTask();

  const choose = async () => {
    setPickError(undefined);
    try {
      setFile(await pickBackupFile());
    } catch (e) {
      setPickError(e instanceof Error ? e.message : String(e));
    }
  };

  const onRestore = async () => {
    if (!store || !file) return;
    const ok = await confirm('Replace everything on this phone?', 'Your current profile and trips will be replaced by the backup.', 'Replace');
    if (!ok) return;
    if (await task.run((onProgress) => restoreBackup(store, file, pass, onProgress))) {
      await reload();
      dismissReset();
    }
  };

  const footer = task.done ? (
    <Button label="Done" onPress={() => router.dismissTo('/')} />
  ) : file ? (
    <Button label="Decrypt & restore" onPress={onRestore} disabled={!!passphraseIssue(pass)} loading={task.running} />
  ) : (
    <Button label="Choose backup file" onPress={choose} />
  );

  return (
    <Screen footer={footer}>
      <Body>Pick a .nomadbackup file you exported earlier, then enter its passphrase.</Body>
      {pickError ? <Banner tone="danger" title={pickError} /> : null}
      {file ? (
        <>
          <Banner title="Backup file selected" />
          <Card className="gap-4">
            <PassphraseFields value={pass} onChange={setPass} />
          </Card>
        </>
      ) : null}
      <TaskStatus task={task} working="Decrypting… this takes a few seconds." doneTitle="Restored" doneText="Your profile and trips are back." />
    </Screen>
  );
}
