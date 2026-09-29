import { passphraseProblem } from '../../../backup/envelope';
import { Field, TextField } from '../../../ui/Field';

type Props = Readonly<{
  value: string;
  onChange: (v: string) => void;
  confirmValue?: string; //         pass to show a "repeat passphrase" field (export)
  onConfirmChange?: (v: string) => void;
}>;

const SECRET = { secureTextEntry: true, autoCapitalize: 'none', autoCorrect: false, textContentType: 'password' } as const;

/** Returns why the passphrase(s) can't be used yet, or null */
export const passphraseIssue = (value: string, confirmValue?: string): string | null =>
  passphraseProblem(value) ?? (confirmValue !== undefined && confirmValue !== value ? 'The passphrases don’t match.' : null);

export const PassphraseFields = ({ value, onChange, confirmValue, onConfirmChange }: Props) => (
  <>
    <Field label="Passphrase" hint={confirmValue !== undefined ? 'At least 10 characters. A few random words is easy to remember and hard to guess.' : undefined}>
      <TextField {...SECRET} value={value} onChangeText={onChange} placeholder="Backup passphrase" accessibilityLabel="Passphrase" />
    </Field>
    {confirmValue !== undefined && onConfirmChange ? (
      <Field label="Repeat passphrase">
        <TextField {...SECRET} value={confirmValue} onChangeText={onConfirmChange} placeholder="Type it again" accessibilityLabel="Repeat passphrase" />
      </Field>
    ) : null}
  </>
);
