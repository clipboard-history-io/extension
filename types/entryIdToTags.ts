import * as z from 'zod';

export const EntryIdToTags = z.record(z.string(), z.array(z.string().toLowerCase()));
export type EntryIdToTags = z.infer<typeof EntryIdToTags>;
