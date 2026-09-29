import { z } from 'zod';
import { Iso2Schema, IsoDateSchema, JurisdictionSchema } from '../rules/schema';

/** One trip into one country, as stored on the device */
export const StayRecordSchema = z
  .object({
    id: z.string().min(1).max(64),
    country: Iso2Schema,
    entry: IsoDateSchema,
    exit: IsoDateSchema.optional(), // missing = still there
    note: z.string().max(500).optional(),
  })
  .refine((s) => !s.exit || s.exit >= s.entry, { message: 'Exit date is before entry date', path: ['exit'] });

export const ProfileSchema = z.object({
  taxResidence: Iso2Schema.nullable(), // null until onboarding is done
  passports: z.array(Iso2Schema),
});

export const LEAD_DAY_OPTIONS = [30, 14, 7, 3, 1] as const;
export const REMINDER_HOUR_OPTIONS = [8, 9, 12, 18] as const;

export const ReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  leadDays: z.array(z.number().int().min(1).max(60)).max(5), // days before a limit
  hour: z.number().int().min(0).max(23), //                   local time to send them
});

export const SettingsSchema = z.object({
  reminders: ReminderSettingsSchema,
});

export const defaultSettings = (): Settings => ({
  reminders: { enabled: false, leadDays: [14, 7, 1], hour: 9 },
});

/** Everything the app stores. Also the plaintext inside an encrypted backup. */
export const AppDataSchema = z.object({
  schemaVersion: z.literal(1),
  profile: ProfileSchema,
  stays: z.array(StayRecordSchema),
  customJurisdictions: z.array(JurisdictionSchema),
  // Added after v1 backups existed: older files without it get the defaults
  settings: SettingsSchema.default(defaultSettings),
});

export type StayRecord = z.infer<typeof StayRecordSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type AppData = z.infer<typeof AppDataSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type ReminderSettings = z.infer<typeof ReminderSettingsSchema>;

export const emptyAppData = (): AppData => ({
  schemaVersion: 1,
  profile: { taxResidence: null, passports: [] },
  stays: [],
  customJurisdictions: [],
  settings: defaultSettings(),
});
