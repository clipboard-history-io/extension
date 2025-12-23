import * as z from 'zod';

export const StorageLocation = z.enum(["Local", "Cloud"]);
export type StorageLocation = z.infer<typeof StorageLocation>;
