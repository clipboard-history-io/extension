import { z } from "zod";

export const ItemSortOption = z.enum(["DateCreated", "DateLastCopied"]);
export type ItemSortOption = z.infer<typeof ItemSortOption>;
