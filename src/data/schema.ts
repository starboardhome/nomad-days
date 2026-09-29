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

/** Everything the app stores. Also the plaintext inside an encrypted backup. */
export const AppDataSchema = z.object({
  schemaVersion: z.literal(1),
  profile: ProfileSchema,
  stays: z.array(StayRecordSchema),
  customJurisdictions: z.array(JurisdictionSchema),
});

export type StayRecord = z.infer<typeof StayRecordSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type AppData = z.infer<typeof AppDataSchema>;

export const emptyAppData = (): AppData => ({
  schemaVersion: 1,
  profile: { taxResidence: null, passports: [] },
  stays: [],
  customJurisdictions: [],
});
