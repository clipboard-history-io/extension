import { match } from "ts-pattern";

import type { Entry } from "~types/entry";
import { ItemSortOption } from "~types/itemSortOption";
import type { Settings } from "~types/settings";

import { isImageContent } from "./imageContent";

export const handleEntryIds = async ({
  entryIds,
  handleLocalEntryIds,
  handleCloudEntryIds,
}: {
  entryIds: string[];
  handleLocalEntryIds: (entryIds: string[]) => Promise<void>;
  handleCloudEntryIds: (entryIds: string[]) => Promise<void>;
}) => {
  const localEntryIds = entryIds.filter((entryId) => entryId.length !== 36);
  const cloudEntryIds = entryIds.filter((entryId) => entryId.length === 36);

  const results = await Promise.allSettled([
    localEntryIds.length > 0 && handleLocalEntryIds(localEntryIds),
    cloudEntryIds.length > 0 && handleCloudEntryIds(cloudEntryIds),
  ]);

  const errors = results.flatMap((result) => (result.status === "rejected" ? result.reason : []));

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};

export const getEntryCopiedAt = (entry: Entry) => entry.copiedAt || entry.createdAt;

export const getEntryTimestamp = (entry: Entry, settings: Settings) =>
  match(settings.sortItemsBy)
    .with(ItemSortOption.Enum.DateCreated, () => entry.createdAt)
    .with(ItemSortOption.Enum.DateLastCopied, () => getEntryCopiedAt(entry))
    .exhaustive();

export const applyLocalItemLimit = (
  entries: Entry[],
  settings: Settings,
  favoriteEntryIds: string[],
): [Entry[], string[]] => {
  const { localItemLimit } = settings;

  if (localItemLimit === null) {
    return [entries, []];
  }

  const favoriteEntryIdSet = new Set(favoriteEntryIds);

  const [newEntries, skippedEntryIds] = entries
    .sort((a, b) => getEntryTimestamp(a, settings) - getEntryTimestamp(b, settings))
    .reduceRight<[Entry[], string[], number]>(
      (acc, curr) => {
        if (favoriteEntryIdSet.has(curr.id)) {
          acc[0].push(curr);
          return acc;
        }

        if (acc[2] < localItemLimit) {
          acc[0].push(curr);
          acc[2] += 1;
          return acc;
        }

        acc[1].push(curr.id);
        return acc;
      },
      [[], [], 0],
    );

  return [newEntries, skippedEntryIds];
};

// Evicts the oldest non-favorited image entries once total image content exceeds the storage
// limit. All entries are stored under a single storage key, so without this a handful of large
// screenshots would make every entries read and write prohibitively expensive. Data URL length
// approximates stored bytes, so the limit is compared against content length directly.
export const applyLocalImageBudget = (
  entries: Entry[],
  settings: Settings,
  favoriteEntryIds: string[],
): [Entry[], string[]] => {
  const { localImageStorageLimit } = settings;

  if (localImageStorageLimit === null) {
    return [entries, []];
  }

  const favoriteEntryIdSet = new Set(favoriteEntryIds);

  const [newEntries, skippedEntryIds] = entries
    .sort((a, b) => getEntryTimestamp(a, settings) - getEntryTimestamp(b, settings))
    .reduceRight<[Entry[], string[], number]>(
      (acc, curr) => {
        if (!isImageContent(curr.content) || favoriteEntryIdSet.has(curr.id)) {
          acc[0].push(curr);
          return acc;
        }

        if (acc[2] + curr.content.length <= localImageStorageLimit) {
          acc[0].push(curr);
          acc[2] += curr.content.length;
          return acc;
        }

        acc[1].push(curr.id);
        return acc;
      },
      [[], [], 0],
    );

  return [newEntries, skippedEntryIds];
};
