import * as z from 'zod';

import { Storage } from "@plasmohq/storage";

import { VERSION } from "~utils/version";

const storage = new Storage({
  area: "local",
});

// Do not change this without a migration.
const CHANGELOG_VIEWED_AT_STORAGE_KEY = "changelogViewedAt";

export const watchChangelogViewedAt = (cb: (changelogViewedAt?: string) => void) => {
  return storage.watch({
    [CHANGELOG_VIEWED_AT_STORAGE_KEY]: (c) => {
      const parsed = z.string().safeParse(c.newValue);

      cb(parsed.success ? parsed.data : undefined);
    },
  });
};

export const getChangelogViewedAt = async () => {
  const parsed = z.string().safeParse(await storage.get(CHANGELOG_VIEWED_AT_STORAGE_KEY));

  return parsed.success ? parsed.data : undefined;
};

export const updateChangelogViewedAt = async () => {
  await storage.set(CHANGELOG_VIEWED_AT_STORAGE_KEY, VERSION);
};
