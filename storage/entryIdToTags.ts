import * as z from 'zod';

import { Storage } from "@plasmohq/storage";

import { EntryIdToTags } from "~types/entryIdToTags";
import db from "~utils/db/core";

// Do not change this without a migration.
const ENTRY_ID_TO_TAGS_STORAGE_KEY = "entryIdToTags";

const storage = new Storage({
  area: "local",
});

export const watchEntryIdToTags = (cb: (entryIdToTags: EntryIdToTags) => void) => {
  return storage.watch({
    [ENTRY_ID_TO_TAGS_STORAGE_KEY]: (c) => {
      const parsed = EntryIdToTags.safeParse(c.newValue);

      cb(parsed.success ? parsed.data : {});
    },
  });
};

export const getEntryIdToTags = async () => {
  const parsed = EntryIdToTags.safeParse(
    await storage.get<EntryIdToTags>(ENTRY_ID_TO_TAGS_STORAGE_KEY),
  );

  return parsed.success ? parsed.data : {};
};

// Make sure tags are always unique and lowercase.
export const _setEntryIdToTags = async (entryIdToTags: EntryIdToTags) => {
  await storage.set(ENTRY_ID_TO_TAGS_STORAGE_KEY, entryIdToTags);
};

export const deleteEntryIdsFromEntryIdToTags = async (entryIds: string[]) => {
  const entryIdToTags = await getEntryIdToTags();

  entryIds.forEach((entryId) => delete entryIdToTags[entryId]);

  await _setEntryIdToTags(entryIdToTags);
};

export const toggleEntryTag = async (entryId: string, tag: string) => {
  const normalizedTag = tag.toLowerCase();

  if (entryId.length === 36) {
    const cloudEntryQuery = await db.queryOnce({
      entries: {
        $: {
          where: {
            id: entryId,
          },
        },
      },
    });

    const cloudEntry = cloudEntryQuery.data.entries[0];

    if (!cloudEntry) {
      return;
    }

    const s = new Set(
      z
        .array(z.string())
        .catch([])
        .parse(JSON.parse(cloudEntry.tags || "[]")),
    );
    if (s.has(normalizedTag)) {
      s.delete(normalizedTag);
    } else {
      s.add(normalizedTag);
    }

    await db.transact(
      db.tx.entries[entryId]!.update({
        tags: s.size > 0 ? JSON.stringify(Array.from(s)) : null,
      }),
    );

    return;
  }

  const entryIdToTags = await getEntryIdToTags();

  const s = new Set(entryIdToTags[entryId] || []);
  if (s.has(normalizedTag)) {
    s.delete(normalizedTag);
  } else {
    s.add(normalizedTag);
  }

  entryIdToTags[entryId] = Array.from(s);

  await _setEntryIdToTags(entryIdToTags);
};
