import * as z from 'zod';

export const ClipboardSnapshot = z.object({
  content: z.string(),
  updatedAt: z.number(),
});
export type ClipboardSnapshot = z.infer<typeof ClipboardSnapshot>;
