import * as z from 'zod';

import { Storage } from "@plasmohq/storage";

import db from "~utils/db/core";
import { handleEntryIds } from "~utils/entries";

const storage = new Storage({
  area: "local",
});

export const watchFavoriteEntryIds = (cb: (entryIds: string[]) => void) => {
  return storage.watch({
    favoriteEntryIds: (c) => {
      const parsed = z.array(z.string()).safeParse(c.newValue);

      if (parsed.success) {
        cb(parsed.data);
        return;
      }

      _setFavoriteEntryIds([]);

      cb([]);
    },
  });
};

export const getFavoriteEntryIds = async () => {
  const entries = await storage.get("favoriteEntryIds");
  const parsed = z.array(z.string()).safeParse(entries);

  if (parsed.success) {
    return parsed.data;
  }

  await _setFavoriteEntryIds([]);

  return [];
};

export const _setFavoriteEntryIds = async (entryIds: string[]) =>
  storage.set("favoriteEntryIds", entryIds);

export const addFavoriteEntryIds = async (entryIds: string[]) => {
  await handleEntryIds({
    entryIds,
    handleLocalEntryIds: async (localEntryIds) => {
      const favoriteEntryIds = await getFavoriteEntryIds();
      await _setFavoriteEntryIds(Array.from(new Set([...favoriteEntryIds, ...localEntryIds])));
    },
    handleCloudEntryIds: async (cloudEntryIds) => {
      await db.transact(
        cloudEntryIds.map((cloudEntryId) =>
          db.tx.entries[cloudEntryId]!.update({ isFavorited: true }),
        ),
      );
    },
  });
};

export const deleteFavoriteEntryIds = async (entryIds: string[]) => {
  await handleEntryIds({
    entryIds,
    handleLocalEntryIds: async (localEntryIds) => {
      const s = new Set(localEntryIds);

      const favoriteEntryIds = await getFavoriteEntryIds();
      await _setFavoriteEntryIds(favoriteEntryIds.filter((localEntryId) => !s.has(localEntryId)));
    },
    handleCloudEntryIds: async (cloudEntryIds) => {
      await db.transact(
        cloudEntryIds.map((cloudEntryId) =>
          db.tx.entries[cloudEntryId]!.update({ isFavorited: false }),
        ),
      );
    },
  });
};
