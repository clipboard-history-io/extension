import { z } from "zod";

export const ItemSortOption = z.enum(["DateCreated", "DateLastCopied","Alphabetically"]);
export type ItemSortOption = z.infer<typeof ItemSortOption>;
