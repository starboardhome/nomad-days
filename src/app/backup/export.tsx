import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { exportBackup, saveBackupToDevice } from '../../backup/files';
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

  const [saved, setSaved] = useState(false);
  const android = Platform.OS === 'android';

  const run = (toDevice: boolean) => {
    if (!store) return;
    setSaved(toDevice);
    task.run((onProgress) => (toDevice ? saveBackupToDevice : exportBackup)(store, pass, onProgress));
  };
  const onShare = () => run(false);
  const onSave = () => run(true);

  return (
    <Screen
      footer={
        task.done ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : android ? (
          <View className="gap-2">
            <Button label="Encrypt & save to device" onPress={onSave} disabled={!!issue || task.running} loading={task.running && saved} />
            <Button label="Encrypt & share" variant="secondary" onPress={onShare} disabled={!!issue || task.running} loading={task.running && !saved} />
          </View>
        ) : (
          <Button label="Encrypt & share" onPress={onShare} disabled={!!issue} loading={task.running} />
        )
      }
    >
      <Body>
        {android
          ? 'Creates one encrypted file with your profile and trips. Save it to a folder on this phone, like Downloads, or share it to a USB stick, another device or an email to yourself.'
          : 'Creates one encrypted file with your profile and trips. Save it somewhere safe, like Files, iCloud Drive, a USB stick or an email to yourself.'}
      </Body>
      <Banner tone="warn" title="There’s no way to recover a forgotten passphrase">
        Without it, nobody can open the backup, including you. Write it down somewhere safe.
      </Banner>
      <Card className="gap-4">
        <PassphraseFields value={pass} onChange={setPass} confirmValue={repeat} onConfirmChange={setRepeat} />
      </Card>
      {pass && issue ? <Banner tone="warn" title={issue} /> : null}
      <TaskStatus
        task={task}
        working="Encrypting… this takes a few seconds."
        doneTitle={saved ? 'Backup saved' : 'Backup created'}
        doneText={saved ? 'It’s in the folder you chose. Copy it off the phone too, in case the phone is lost.' : "If you didn't save it, run the export again."}
      />
    </Screen>
  );
}
