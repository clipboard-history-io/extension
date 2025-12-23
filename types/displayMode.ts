import * as z from 'zod';

export const DisplayMode = z.enum(["Popup", "SidePanel"]);
export type DisplayMode = z.infer<typeof DisplayMode>;
