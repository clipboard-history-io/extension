import { z } from "zod";

export const Tab = z.enum(["All", "Favorites", "Cloud", "Trash"]);
export type Tab = z.infer<typeof Tab>;
