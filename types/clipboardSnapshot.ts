import { z } from "zod";

export const ClipboardSnapshot = z.object({
  content: z.string(),
  // The browser's re-encoding of content as the clipboard monitor will read it, when the two
  // differ (i.e. after copying an image entry). content drives the copied indicator while this
  // drives the monitor's change detection.
  canonicalContent: z.string().optional(),
  updatedAt: z.number(),
});
export type ClipboardSnapshot = z.infer<typeof ClipboardSnapshot>;
