/** Web preview: a plain HTML date input */
import { createElement } from 'react';
import { Field, INPUT } from './Field';
import type { DateFieldProps } from './dateValue';

export const DateField = ({ label, value, onChange, min, max }: DateFieldProps) => (
  <Field label={label}>
    {createElement('input', {
      type: 'date',
      value,
      min,
      max,
      'aria-label': label,
      className: INPUT,
      style: { fontSize: 16, fontFamily: 'inherit' },
      onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
    })}
  </Field>
);
