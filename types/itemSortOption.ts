import * as z from 'zod';

export const ItemSortOption = z.enum(["DateCreated", "DateLastCopied", "Content"]);
export type ItemSortOption = z.infer<typeof ItemSortOption>;
