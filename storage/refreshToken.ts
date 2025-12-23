import * as z from 'zod';

import { Storage } from "@plasmohq/storage";

const storage = new Storage({
  area: "local",
});

// Do not change this without a migration.
const REFRESH_TOKEN_STORAGE_KEY = "refreshToken";

export const watchRefreshToken = (cb: (refreshToken: string | null) => void) => {
  return storage.watch({
    [REFRESH_TOKEN_STORAGE_KEY]: (c) => cb(z.string().nullable().catch(null).parse(c.newValue)),
  });
};

export const getRefreshToken = async () => {
  return z
    .string()
    .nullable()
    .catch(null)
    .parse(await storage.get(REFRESH_TOKEN_STORAGE_KEY));
};

export const setRefreshToken = async (refreshToken: string) => {
  await storage.set(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
};

export const deleteRefreshToken = async () => {
  await storage.remove(REFRESH_TOKEN_STORAGE_KEY);
};
