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
const ENTRIES_STORAGE_KEY = "entryIdSetentries"; // Legacy flat list key used for migration.

const storage = new Storage({
  area: "local",
});

const ENTRY_BUCKET_KEY_PREFIX = "entryBucketV1:";
const ENTRY_BUCKET_INDEX_KEY = "entryBucketIndexV1";
const ENTRY_ORDER_KEY = "entryOrderV1";
const ENTRY_VERSION_KEY = "entryVersionV1";
const ENTRY_HASH_PREFIX_LENGTH = 8;

type EntryBucket = Record<string, Entry>;

interface BucketPersistContext {
  index: Set<string>;
  indexChanged: boolean;
}

interface WriteEntriesSnapshotOptions {
  skipEnsure?: boolean;
}

let entryMigrationPromise: Promise<void> | null = null;

const getEntryHashPrefix = (entryId: string) => entryId.slice(0, ENTRY_HASH_PREFIX_LENGTH);

const getBucketKey = (prefix: string) => `${ENTRY_BUCKET_KEY_PREFIX}${prefix}`;

const getBucketIndex = async (): Promise<Set<string>> => {
  const prefixes = await storage.get<string[]>(ENTRY_BUCKET_INDEX_KEY);
  return new Set(prefixes || []);
};

const saveBucketIndex = async (index: Set<string>) => {
  if (index.size === 0) {
    await storage.remove(ENTRY_BUCKET_INDEX_KEY);
    return;
  }

  await storage.set(ENTRY_BUCKET_INDEX_KEY, Array.from(index));
};

const getEntryBucket = async (prefix: string): Promise<EntryBucket> => {
  const bucket = await storage.get<EntryBucket>(getBucketKey(prefix));
  return bucket ? { ...bucket } : {};
};

const persistBuckets = async (
  updates: Map<string, EntryBucket>,
  ctx?: BucketPersistContext,
): Promise<BucketPersistContext> => {
  const context = ctx ?? { index: await getBucketIndex(), indexChanged: false };

  for (const [prefix, bucket] of updates) {
    const key = getBucketKey(prefix);
    const isEmpty = Object.keys(bucket).length === 0;
    const hadPrefix = context.index.has(prefix);

    if (isEmpty) {
      await storage.remove(key);
      if (hadPrefix) {
        context.index.delete(prefix);
        context.indexChanged = true;
      }
    } else {
      await storage.set(key, bucket);
      if (!hadPrefix) {
        context.index.add(prefix);
        context.indexChanged = true;
      }
    }
  }

  if (!ctx && context.indexChanged) {
    await saveBucketIndex(context.index);
    context.indexChanged = false;
  }

  return context;
};

const flushBucketContext = async (ctx: BucketPersistContext) => {
  if (ctx.indexChanged) {
    await saveBucketIndex(ctx.index);
    ctx.indexChanged = false;
  }
};

const removeEntryIdsFromBuckets = async (entryIds: string[]) => {
  const uniqueIds = Array.from(new Set(entryIds));
  if (uniqueIds.length === 0) {
    return;
  }

  const bucketCache = new Map<string, EntryBucket>();
  const updates = new Map<string, EntryBucket>();

  for (const entryId of uniqueIds) {
    const prefix = getEntryHashPrefix(entryId);
    let bucket = bucketCache.get(prefix);
    if (!bucket) {
      bucket = await getEntryBucket(prefix);
      bucketCache.set(prefix, bucket);
    }

    if (bucket[entryId] !== undefined) {
      delete bucket[entryId];
      updates.set(prefix, bucket);
    }
  }

  if (updates.size > 0) {
    await persistBuckets(updates);
  }
};

const getEntryOrder = async (): Promise<string[]> => {
  const order = await storage.get<string[]>(ENTRY_ORDER_KEY);
  return order ? [...order] : [];
};

const setEntryOrder = async (order: string[]) => {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const entryId of order) {
    if (!seen.has(entryId)) {
      seen.add(entryId);
      deduped.push(entryId);
    }
  }

  if (deduped.length === 0) {
    await storage.remove(ENTRY_ORDER_KEY);
  } else {
    await storage.set(ENTRY_ORDER_KEY, deduped);
  }

  return deduped;
};

const bumpEntriesVersion = async () => {
  await storage.set(ENTRY_VERSION_KEY, `${Date.now()}-${Math.random()}`);
};

const getEntriesByOrder = async (order: string[]): Promise<Entry[]> => {
  if (order.length === 0) {
    return [];
  }

  const uniquePrefixes = Array.from(new Set(order.map(getEntryHashPrefix)));
  const buckets = await Promise.all(
    uniquePrefixes.map(async (prefix) => [prefix, await getEntryBucket(prefix)] as const),
  );
  const bucketMap = new Map<string, EntryBucket>(buckets);

  const entries: Entry[] = [];
  for (const entryId of order) {
    const prefix = getEntryHashPrefix(entryId);
    const bucket = bucketMap.get(prefix);
    const entry = bucket?.[entryId];

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
};

const entryExists = async (entryId: string) => {
  const prefix = getEntryHashPrefix(entryId);
  const bucket = await getEntryBucket(prefix);
  return bucket[entryId] !== undefined;
};

const getEntryById = async (entryId: string) => {
  const prefix = getEntryHashPrefix(entryId);
  const bucket = await getEntryBucket(prefix);
  return bucket[entryId];
};

const writeEntriesSnapshot = async (
  entries: Entry[],
  options?: WriteEntriesSnapshotOptions,
) => {
  if (!options?.skipEnsure) {
    await ensureEntryStorageMigrated();
  }

  const updates = new Map<string, EntryBucket>();

  for (const entry of entries) {
    const prefix = getEntryHashPrefix(entry.id);
    let bucket = updates.get(prefix);
    if (!bucket) {
      bucket = {};
      updates.set(prefix, bucket);
    }

    bucket[entry.id] = entry;
  }

  const existingIndex = await getBucketIndex();
  for (const prefix of existingIndex) {
    if (!updates.has(prefix)) {
      updates.set(prefix, {});
    }
  }

  const ctx = await persistBuckets(updates, { index: existingIndex, indexChanged: false });
  await flushBucketContext(ctx);

  const order = await setEntryOrder(entries.map((entry) => entry.id));

  await handleUpdateTotalItemsBadgeRequest(order.length);
  await bumpEntriesVersion();
};

const migrateLegacyEntries = async (legacyEntries: Entry[]) => {
  if (legacyEntries.length === 0) {
    await storage.remove(ENTRIES_STORAGE_KEY);
    return;
  }

  await writeEntriesSnapshot(legacyEntries, { skipEnsure: true });
  await storage.remove(ENTRIES_STORAGE_KEY);
};

const ensureEntryStorageMigrated = async () => {
  if (!entryMigrationPromise) {
    entryMigrationPromise = (async () => {
      const legacyEntries = await storage.get(ENTRIES_STORAGE_KEY);
      if (legacyEntries === undefined) {
        return;
      }

      const parsed = Entry.array().safeParse(legacyEntries);
      if (!parsed.success) {
        await storage.remove(ENTRIES_STORAGE_KEY);
        return;
      }

      await migrateLegacyEntries(parsed.data);
    })();
  }

  await entryMigrationPromise;
};

const entryStorageMigrationBootstrapPromise = ensureEntryStorageMigrated();

export const runEntryStorageMigration = async () => {
  await entryStorageMigrationBootstrapPromise;
};

export const watchEntries = (cb: (entries: Entry[]) => void) => {
  void entryStorageMigrationBootstrapPromise;

  return storage.watch({
    [ENTRY_VERSION_KEY]: () => {
      getEntries().then(cb);
    },
  });
};

export const getEntries = async (): Promise<Entry[]> => {
  await entryStorageMigrationBootstrapPromise;

  let order = await getEntryOrder();
  if (order.length === 0) {
    const legacyEntries = await storage.get<Entry[]>(ENTRIES_STORAGE_KEY);
    if (!legacyEntries || legacyEntries.length === 0) {
      return [];
    }

    await migrateLegacyEntries(legacyEntries);
    order = await getEntryOrder();

    if (order.length === 0) {
      return legacyEntries;
    }
  }

  return await getEntriesByOrder(order);
};

export const _setEntries = async (entries: Entry[]) => {
  await writeEntriesSnapshot(entries);
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

  await ensureEntryStorageMigrated();

  const entryId = createHash("sha256").update(content).digest("hex");
  const prefix = getEntryHashPrefix(entryId);
  const bucket = await getEntryBucket(prefix);
  const existingEntry = bucket[entryId];
  const now = Date.now();

  if (existingEntry) {
    existingEntry.copiedAt = now;

    await persistBuckets(new Map([[prefix, bucket]]));

    const order = await getEntryOrder();
    await handleUpdateTotalItemsBadgeRequest(order.length);
    await bumpEntriesVersion();

    return;
  }

  const [favoriteEntryIds, settings, orderBefore] = await Promise.all([
    getFavoriteEntryIds(),
    getSettings(),
    getEntryOrder(),
  ]);

  bucket[entryId] = {
    id: entryId,
    createdAt: now,
    copiedAt: now,
    content,
  };

  await persistBuckets(new Map([[prefix, bucket]]));

  const initialOrder = orderBefore.filter((id) => id !== entryId);
  initialOrder.push(entryId);

  let finalOrder: string[];

  if (settings.localItemLimit !== null) {
    const entriesForLimit = await getEntriesByOrder(initialOrder);
    const [limitedEntries, skippedIds] = applyLocalItemLimit(
      entriesForLimit,
      settings,
      favoriteEntryIds,
    );
    finalOrder = limitedEntries.map((entry) => entry.id);

    if (skippedIds.length > 0) {
      await removeEntryIdsFromBuckets(skippedIds);

      await Promise.all([
        deleteEntryIdsFromEntryIdToTags(skippedIds),
        deleteEntryCommands(skippedIds),
      ]);
    }
  } else {
    finalOrder = initialOrder;
  }

  const dedupedOrder = await setEntryOrder(finalOrder);

  await handleUpdateTotalItemsBadgeRequest(dedupedOrder.length);
  await bumpEntriesVersion();
};

export const deleteEntries = async (entryIds: string[]) => {
  await ensureEntryStorageMigrated();

  await handleEntryIds({
    entryIds,
    handleLocalEntryIds: async (localEntryIds) => {
      const favoriteEntryIds = await getFavoriteEntryIds();
      const favoriteSet = new Set(favoriteEntryIds);
      const deletableIds = localEntryIds.filter((entryId) => !favoriteSet.has(entryId));

      if (deletableIds.length === 0) {
        return;
      }

      await removeEntryIdsFromBuckets(deletableIds);

      const order = await getEntryOrder();
      const deletableSet = new Set(deletableIds);
      const newOrder = await setEntryOrder(order.filter((entryId) => !deletableSet.has(entryId)));

      await Promise.all([
        deleteEntryIdsFromEntryIdToTags(deletableIds),
        deleteEntryCommands(deletableIds),
      ]);

      await handleUpdateTotalItemsBadgeRequest(newOrder.length);
      await bumpEntriesVersion();
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

  await ensureEntryStorageMigrated();

  const newEntryId = createHash("sha256").update(content).digest("hex");

  if (await entryExists(newEntryId)) {
    return Err("content must be unique");
  }

  const oldPrefix = getEntryHashPrefix(entryId);
  const oldBucket = await getEntryBucket(oldPrefix);
  const existingEntry = oldBucket[entryId];

  if (!existingEntry) {
    return Ok(undefined);
  }

  const [favoriteEntryIds, entryIdToTags, entryCommands, order] = await Promise.all([
    getFavoriteEntryIds(),
    getEntryIdToTags(),
    getEntryCommands(),
    getEntryOrder(),
  ]);

  delete oldBucket[entryId];

  const updatedEntry: Entry = {
    ...existingEntry,
    id: newEntryId,
    content,
  };

  const updates = new Map<string, EntryBucket>();
  const newPrefix = getEntryHashPrefix(newEntryId);

  if (newPrefix === oldPrefix) {
    oldBucket[newEntryId] = updatedEntry;
    updates.set(oldPrefix, oldBucket);
  } else {
    updates.set(oldPrefix, oldBucket);
    const newBucket = await getEntryBucket(newPrefix);
    newBucket[newEntryId] = updatedEntry;
    updates.set(newPrefix, newBucket);
  }

  await persistBuckets(updates);

  const updatedOrder = order.includes(entryId)
    ? order.map((id) => (id === entryId ? newEntryId : id))
    : [...order, newEntryId];
  const finalOrder = await setEntryOrder(updatedOrder);

  const tags = entryIdToTags[entryId];
  if (tags !== undefined) {
    entryIdToTags[newEntryId] = [...tags];
  }
  delete entryIdToTags[entryId];

  await Promise.all([
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

  await handleUpdateTotalItemsBadgeRequest(finalOrder.length);
  await bumpEntriesVersion();

  return Ok(undefined);
};

export const toggleEntryStorageLocation = async (entryId: string) => {
  await ensureEntryStorageMigrated();

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

  const [favoriteEntryIds, entryIdToTags, user] = await Promise.all([
    getFavoriteEntryIds(),
    getEntryIdToTags(),
    db.getAuth(),
  ]);

  // Return early if user is not signed in.
  if (user === null) {
    return;
  }

  // Return early if local entry doesn't exist.
  const localEntry = await getEntryById(entryId);
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
