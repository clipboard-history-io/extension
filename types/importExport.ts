import { z } from "zod";

// JSON export from this extension.
export const ClipboardHistoryIOExport = z.array(
  z.object({
    createdAt: z.number(),
    copiedAt: z.number().nullable().optional(),
    content: z.string(),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
  }),
);
export type ClipboardHistoryIOExport = z.infer<typeof ClipboardHistoryIOExport>;

// JSON export from Clipboard History Pro: best productivity tool.
// https://chromewebstore.google.com/detail/clipboard-history-pro-bes/ajiejmhbejpdgkkigpddefnjmgcbkenk?hl=en
export const ClipboardHistoryProExport = z.array(
  z.object({
    text: z.string().optional(),
    dateAdded: z.number().optional(),
    dateLastCopied: z.number().optional(),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
  }),
);
export type ClipboardHistoryProExport = z.infer<typeof ClipboardHistoryProExport>;
