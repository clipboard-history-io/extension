import * as z from 'zod';

export const EntryCommand = z.object({
  entryId: z.string(),
  commandName: z.string(),
});
export type EntryCommand = z.infer<typeof EntryCommand>;
