export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type Reminder = Readonly<{
  id: string; //       stable, e.g. "schengen-90-180:leave:7"
  title: string;
  body: string;
  fireAtMs: number; // epoch milliseconds
}>;
