import * as z from 'zod';

export const Tab = z.enum(["All", "Favorites", "Cloud"]);
export type Tab = z.infer<typeof Tab>;
