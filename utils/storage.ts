import { createHash } from "crypto";
import { lookup } from "@instantdb/core";
import { Err, Ok, Result } from "ts-results";
import { z } from "zod";

import { Storage } from "@plasmohq/storage";

import { handleUpdateTotalItemsBadgeRequest } from "~background/messages/updateTotalItemsBadge";
import { _setEntryCommands, deleteEntryCommands, getEntryCommands } from "~storage/entryCommands";
import {
  _setEntryIdToTags,
  deleteEntryIdsFromEntryIdToTags,
  getEntryIdToTags,
} from "~storage/entryIdToTags";
import {
  _setFavoriteEntryIds,
  addFavoriteEntryIds,
  deleteFavoriteEntryIds,
  getFavoriteEntryIds,
} from "~storage/favoriteEntryIds";
import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import { Entry } from "~types/entry";
import { StorageLocation } from "~types/storageLocation";

import db from "./db/core";
import { applyLocalItemLimit, handleEntryIds } from "./entries";

// Do not change this without a migration.
const ENTRIES_STORAGE_KEY = "entryIdSetentries";

const storage = new Storage({
  area: "local",
});

// Entries are not parsed to optimize for performance. This means corrupted entries will break the
// extension.
//
// TODO: Long poll to reset state of the extension in the event of corrupted entries.
export const watchEntries = (cb: (entries: Entry[]) => void) => {
  return storage.watch({
    [ENTRIES_STORAGE_KEY]: (c) => {
      if (c.newValue === undefined) {
        cb([]);
      } else {
        cb(c.newValue as Entry[]);
      }
    },
  });
};

// Entries are not parsed to optimize for performance. This means corrupted entries will break the
// extension.
//
// TODO: Long poll to reset state of the extension in the event of corrupted entries.
export const getEntries = async () => {
  const entries = await storage.get<Entry[]>(ENTRIES_STORAGE_KEY);
  if (entries === undefined) {
    return [];
  }

  return entries;
};

export const _setEntries = async (entries: Entry[]) => {
  await Promise.all([
    storage.set(ENTRIES_STORAGE_KEY, entries),
    handleUpdateTotalItemsBadgeRequest(entries.length),
  ]);
};

// Creates an entry in the provided storage location. If the provided storage location is cloud but
// the user isn't signed in or isn't subscribed then it should be created locally.
export const createEntry = async (content: string, storageLocation: StorageLocation) => {
  const [refreshToken, user] = await Promise.all([getRefreshToken(), db.getAuth()]);

  if (
    storageLocation === StorageLocation.Enum.Cloud &&
    refreshToken !== null &&
    user !== null &&
    db._reactor.status !== "closed"
  ) {
    try {
      const subscriptionsQuery = await db.queryOnce({
        subscriptions: {},
      });

      if (subscriptionsQuery.data.subscriptions.length > 0) {
        const contentHash = createHash("sha256").update(content).digest("hex");

        const emailContentHash = `${user.email}+${contentHash}`;

        const entriesQuery = await db.queryOnce({
          entries: {
            $: {
              where: {
                emailContentHash,
              },
            },
          },
        });

        const now = Date.now();

        await db.transact(
          db.tx.entries[lookup("emailContentHash", emailContentHash)]!.update({
            ...(entriesQuery.data.entries.length ? {} : { createdAt: now }),
            copiedAt: now,
            content: content,
          }).link({ $user: lookup("email", user.email) }),
        );

        return;
      }
    } catch (e) {
      console.log(e);
    }
  }

  const [entries, favoriteEntryIds, settings] = await Promise.all([
    getEntries(),
    getFavoriteEntryIds(),
    getSettings(),
  ]);

  const entryId = createHash("sha256").update(content).digest("hex");

  const entry = entries.find((entry) => entry.id === entryId);
  if (entry === undefined) {
    const now = Date.now();

    entries.push({
      id: entryId,
      createdAt: now,
      copiedAt: now,
      content,
    });
  } else {
    entry.copiedAt = Date.now();
  }

  const [newEntries, skippedEntryIds] = applyLocalItemLimit(entries, settings, favoriteEntryIds);

  await Promise.all([
    _setEntries(newEntries),
    skippedEntryIds.length > 0 && deleteEntryIdsFromEntryIdToTags(skippedEntryIds),
    skippedEntryIds.length > 0 && deleteEntryCommands(skippedEntryIds),
  ]);
};

export const deleteEntries = async (entryIds: string[]) => {
  await handleEntryIds({
    entryIds,
    handleLocalEntryIds: async (localEntryIds) => {
      const s = new Set(localEntryIds);

      const [entries, favoriteEntryIds] = await Promise.all([getEntries(), getFavoriteEntryIds()]);
      // Favorited entries cannot be deleted.
      favoriteEntryIds.forEach((entryId) => s.delete(entryId));

      await Promise.all([
        _setEntries(entries.filter(({ id }) => !s.has(id))),
        deleteEntryIdsFromEntryIdToTags(localEntryIds),
        deleteEntryCommands(localEntryIds),
      ]);
    },
    handleCloudEntryIds: async (cloudEntryIds) => {
      // TODO: Protect favorited entries from being deleted since the backend no longer enforces
      // it.
      await db.transact(cloudEntryIds.map((cloudEntryId) => db.tx.entries[cloudEntryId]!.delete()));
    },
  });
};

export const updateEntryContent = async (
  entryId: string,
  content: string,
): Promise<Result<undefined, "content must be unique">> => {
  if (entryId.length === 36) {
    const [user, entriesQuery] = await Promise.all([
      db.getAuth(),
      db.queryOnce({
        entries: {
          $: {
            where: {
              content,
            },
          },
        },
      }),
    ]);

    if (user === null) {
      return Ok(undefined);
    }

    if (entriesQuery.data.entries.length > 0) {
      return Err("content must be unique");
    }

    await db.transact(
      db.tx.entries[entryId]!.update({
        content,
        emailContentHash: `${user.email}+${createHash("sha256").update(content).digest("hex")}`,
      }),
    );

    return Ok(undefined);
  }

  const [entries, favoriteEntryIds, entryIdToTags, entryCommands] = await Promise.all([
    getEntries(),
    getFavoriteEntryIds(),
    getEntryIdToTags(),
    getEntryCommands(),
  ]);

  const newEntryId = createHash("sha256").update(content).digest("hex");

  if (entries.some((entry) => entry.id === newEntryId)) {
    return Err("content must be unique");
  }

  const tags = entryIdToTags[entryId];
  if (tags !== undefined) {
    entryIdToTags[newEntryId] = [...tags];
  }
  delete entryIdToTags[entryId];

  await Promise.all([
    _setEntries(
      entries.map((entry) =>
        entry.id === entryId ? { ...entry, id: newEntryId, content } : entry,
      ),
    ),
    _setFavoriteEntryIds(
      favoriteEntryIds.map((favoriteEntryId) =>
        favoriteEntryId === entryId ? newEntryId : favoriteEntryId,
      ),
    ),
    _setEntryIdToTags(entryIdToTags),
    _setEntryCommands(
      entryCommands.map((entryCommand) =>
        entryCommand.entryId === entryId ? { ...entryCommand, entryId: newEntryId } : entryCommand,
      ),
    ),
  ]);

  return Ok(undefined);
};

export const toggleEntryStorageLocation = async (entryId: string) => {
  if (entryId.length === 36) {
    const [entries, entryIdToTags, cloudEntryQuery] = await Promise.all([
      getEntries(),
      getEntryIdToTags(),
      db.queryOnce({
        entries: {
          $: {
            where: {
              id: entryId,
            },
          },
        },
      }),
    ]);

    // Return early if cloud entry doesn't exist.
    const cloudEntry = cloudEntryQuery.data.entries[0];
    if (!cloudEntry) {
      return;
    }

    // Return early if local entry already exists.
    const contentHash = createHash("sha256").update(cloudEntry.content).digest("hex");
    if (entries.some((entry) => entry.id === contentHash)) {
      return;
    }

    // Copy cloud entry to local.
    entries.push({
      id: contentHash,
      createdAt: cloudEntry.createdAt,
      copiedAt: cloudEntry.copiedAt,
      content: cloudEntry.content,
    });

    // Copy cloud entry tags to local.
    entryIdToTags[contentHash] = z
      .array(z.string())
      .catch([])
      .parse(JSON.parse(cloudEntry.tags || "[]"));

    await Promise.all([
      _setEntries(entries),
      cloudEntry.isFavorited
        ? addFavoriteEntryIds([contentHash])
        : deleteFavoriteEntryIds([contentHash]),
      _setEntryIdToTags(entryIdToTags),
    ]);

    await db.transact(db.tx.entries[entryId]!.delete());

    return;
  }

  const [entries, favoriteEntryIds, entryIdToTags, user] = await Promise.all([
    getEntries(),
    getFavoriteEntryIds(),
    getEntryIdToTags(),
    db.getAuth(),
  ]);

  // Return early if user is not signed in.
  if (user === null) {
    return;
  }

  // Return early if local entry doesn't exist.
  const localEntry = entries.find((entry) => entry.id === entryId);
  if (!localEntry) {
    return;
  }

  // Return early if cloud entry already exists.
  const cloudEntryQuery = await db.queryOnce({
    entries: {
      $: {
        where: {
          emailContentHash: `${user.email}+${localEntry.id}`,
        },
      },
    },
  });
  if (cloudEntryQuery.data.entries.length > 0) {
    return;
  }

  // Copy local entry to cloud.
  const tags = entryIdToTags[localEntry.id];
  await db.transact(
    db.tx.entries[lookup("emailContentHash", `${user.email}+${localEntry.id}`)]!.update({
      createdAt: localEntry.createdAt,
      copiedAt: localEntry.copiedAt || null,
      content: localEntry.content,
      isFavorited: favoriteEntryIds.includes(localEntry.id),
      tags: tags?.length ? JSON.stringify(tags) : null,
    }).link({ $user: lookup("email", user.email) }),
  );

  await new Promise((r) => setTimeout(r, 400));

  await deleteFavoriteEntryIds([entryId]);
  await deleteEntries([entryId]);

  return;
};
