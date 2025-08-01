import { debounce } from "ts-debounce";
import { z } from "zod";

import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getEntryIdToTags } from "~storage/entryIdToTags";
import { getFavoriteEntryIds } from "~storage/favoriteEntryIds";
import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import type { Entry } from "~types/entry";
import type { EntryIdToTags } from "~types/entryIdToTags";
import db from "~utils/db/core";
import { getEntryTimestamp } from "~utils/entries";
import { entryIdToTagsToAllTags } from "~utils/entryIdToTags";
import { simplePathJoin } from "~utils/simplePath";
import { getEntries } from "~utils/storage";

export type UpdateContextMenusRequestBody = undefined;

// https://www.totaltypescript.com/the-empty-object-type-in-typescript#representing-an-empty-object
export type UpdateContextMenusResponseBody = Record<PropertyKey, never>;

export const handleUpdateContextMenusRequest = debounce(async () => {
  const [localEntries, localFavoriteEntryIds, localEntryIdToTags, settings, refreshToken, user] =
    await Promise.all([
      getEntries(),
      getFavoriteEntryIds(),
      getEntryIdToTags(),
      getSettings(),
      getRefreshToken(),
      db.getAuth(),
    ]);

  if (!settings.pasteFromContextMenu) {
    chrome.contextMenus.removeAll();
    return;
  }

  let cloudEntries: Entry[] = [];
  let cloudFavoriteEntryIds: string[] = [];
  let cloudEntryIdToTags: EntryIdToTags = {};

  if (refreshToken !== null && user !== null && db._reactor.status !== "closed") {
    try {
      const [cloudEntriesQuery, cloudFavoritedEntriesQuery, cloudTaggedEntriesQuery] =
        await Promise.all([
          db.queryOnce({
            entries: {},
          }),
          db.queryOnce({
            entries: {
              $: {
                where: {
                  isFavorited: true,
                },
              },
            },
          }),
          db.queryOnce({
            entries: {
              $: {
                where: {
                  tags: {
                    $isNull: false,
                  },
                },
              },
            },
          }),
        ]);

      cloudEntries = cloudEntriesQuery.data.entries;
      cloudFavoriteEntryIds = cloudFavoritedEntriesQuery.data.entries.map(({ id }) => id);
      cloudEntryIdToTags = cloudTaggedEntriesQuery.data.entries.reduce<EntryIdToTags>(
        (acc, curr) => {
          acc[curr.id] = z
            .array(z.string())
            .catch([])
            .parse(JSON.parse(curr.tags || "[]"));

          return acc;
        },
        {},
      );
    } catch (e) {
      console.log(e);
    }
  }

  const reversedEntries = localEntries
    .concat(cloudEntries)
    .sort((a, b) => getEntryTimestamp(b, settings) - getEntryTimestamp(a, settings));
  const favoriteEntryIdsSet = new Set([...localFavoriteEntryIds, ...cloudFavoriteEntryIds]);
  const favoriteEntries = reversedEntries.filter((entry) => favoriteEntryIdsSet.has(entry.id));
  const entryIdToTags = { ...localEntryIdToTags, ...cloudEntryIdToTags };
  const allTags = entryIdToTagsToAllTags(entryIdToTags).sort();

  chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: simplePathJoin("paste"),
    title: "Paste from Clipboard History IO",
    contexts: ["editable"],
  });

  chrome.contextMenus.create({
    parentId: simplePathJoin("paste"),
    id: simplePathJoin("paste", "all"),
    title: "📋 All",
    contexts: ["editable"],
    enabled: reversedEntries.length > 0,
  });

  chrome.contextMenus.create({
    parentId: simplePathJoin("paste"),
    id: simplePathJoin("paste", "favorites"),
    title: "⭐️ Favorites",
    contexts: ["editable"],
    enabled: favoriteEntries.length > 0,
  });

  if (refreshToken !== null && user !== null && db._reactor.status !== "closed") {
    chrome.contextMenus.create({
      parentId: simplePathJoin("paste"),
      id: simplePathJoin("paste", "cloud"),
      title: "☁️ Cloud",
      contexts: ["editable"],
      enabled: cloudEntries.length > 0,
    });
  }

  chrome.contextMenus.create({
    parentId: simplePathJoin("paste"),
    id: simplePathJoin("paste", "tags"),
    title: "🏷 Tags",
    contexts: ["editable"],
    enabled: allTags.length > 0,
  });

  reversedEntries.slice(0, 20).forEach((entry) =>
    chrome.contextMenus.create({
      parentId: simplePathJoin("paste", "all"),
      id: simplePathJoin("paste", "all", entry.id),
      title: entry.content || " ",
      contexts: ["editable"],
    }),
  );

  favoriteEntries.slice(0, 40).forEach((entry) =>
    chrome.contextMenus.create({
      parentId: simplePathJoin("paste", "favorites"),
      id: simplePathJoin("paste", "favorites", entry.id),
      title: entry.content || " ",
      contexts: ["editable"],
    }),
  );

  if (refreshToken !== null && user !== null && db._reactor.status !== "closed") {
    cloudEntries
      .slice()
      .sort((a, b) => getEntryTimestamp(b, settings) - getEntryTimestamp(a, settings))
      .slice(0, 40)
      .forEach((entry) =>
        chrome.contextMenus.create({
          parentId: simplePathJoin("paste", "cloud"),
          id: simplePathJoin("paste", "cloud", entry.id),
          title: entry.content || " ",
          contexts: ["editable"],
        }),
      );
  }

  allTags.forEach((tag) =>
    chrome.contextMenus.create({
      parentId: simplePathJoin("paste", "tags"),
      id: simplePathJoin("paste", "tags", tag),
      title: tag,
      contexts: ["editable"],
    }),
  );

  reversedEntries
    .filter((entry) => entry.id in entryIdToTags)
    .forEach((entry) =>
      entryIdToTags[entry.id]?.forEach((tag) =>
        chrome.contextMenus.create({
          parentId: simplePathJoin("paste", "tags", tag),
          id: simplePathJoin("paste", "tags", tag, entry.id),
          title: entry.content || " ",
          contexts: ["editable"],
        }),
      ),
    );
}, 400);

const handler: PlasmoMessaging.MessageHandler<
  UpdateContextMenusRequestBody,
  UpdateContextMenusResponseBody
> = async (_, res) => {
  await handleUpdateContextMenusRequest();

  res.send({});
};

export default handler;
