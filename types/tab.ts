import { z } from "zod";

export const Tab = z.enum(["All", "Favorites", "Images", "Cloud"]);
export type Tab = z.infer<typeof Tab>;
