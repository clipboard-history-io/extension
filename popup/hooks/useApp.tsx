import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";

import { sendToBackground } from "@plasmohq/messaging";

import type {
  UpdateContextMenusRequestBody,
  UpdateContextMenusResponseBody,
} from "~background/messages/updateContextMenus";
import { getChangelogViewedAt, watchChangelogViewedAt } from "~storage/changelogViewedAt";
import {
  getClipboardMonitorIsEnabled,
  watchClipboardMonitorIsEnabled,
} from "~storage/clipboardMonitorIsEnabled";
import { getClipboardSnapshot, watchClipboardSnapshot } from "~storage/clipboardSnapshot";
import { getEntryCommands, watchEntryCommands } from "~storage/entryCommands";
import { getEntryIdToTags, watchEntryIdToTags } from "~storage/entryIdToTags";
import { getFavoriteEntryIds, watchFavoriteEntryIds } from "~storage/favoriteEntryIds";
import { getRefreshToken, watchRefreshToken } from "~storage/refreshToken";
import { getSettings, watchSettings } from "~storage/settings";
import { getEntries, runEntryStorageMigration, watchEntries } from "~utils/storage";

import {
  changelogViewedAtAtom,
  clipboardMonitorIsEnabledAtom,
  clipboardSnapshotAtom,
  commandsAtom,
  entriesAtom,
  entryCommandsAtom,
  entryIdToTagsAtom,
  favoriteEntryIdsAtom,
  refreshTokenAtom,
  settingsAtom,
  tabAtom,
  transitioningEntryContentHashAtom,
} from "../states/atoms";

export const useApp = () => {
  const [transitioningEntryContentHash, setTransitioningEntryContentHash] = useAtom(
    transitioningEntryContentHashAtom,
  );
  useEffect(() => {
    if (transitioningEntryContentHash === undefined) {
      return;
    }

    setTimeout(() => setTransitioningEntryContentHash(undefined), 2000);
  }, [transitioningEntryContentHash]);

  // I decided on this approach as opposed to directly calling the sync function in the respective
  // storage mutation functions because I like the idea of keeping context menu updates as separate
  // from core extension logic. We can stick with this until it becomes a serious pain point for
  // users.
  const updateContextMenus = async () => {
    await sendToBackground<UpdateContextMenusRequestBody, UpdateContextMenusResponseBody>({
      name: "updateContextMenus",
    });
  };

  const setTab = useSetAtom(tabAtom);

  const setEntries = useSetAtom(entriesAtom);
  const setFavoriteEntryIds = useSetAtom(favoriteEntryIdsAtom);
  const setEntryIdToTags = useSetAtom(entryIdToTagsAtom);

  const setChangelogViewedAt = useSetAtom(changelogViewedAtAtom);
  const setClipboardMonitorIsEnabled = useSetAtom(clipboardMonitorIsEnabledAtom);
  const setClipboardSnapshot = useSetAtom(clipboardSnapshotAtom);
  const setEntryCommands = useSetAtom(entryCommandsAtom);
  const setRefreshToken = useSetAtom(refreshTokenAtom);
  const setSettings = useSetAtom(settingsAtom);
  useEffect(() => {
    const migrationPromise = runEntryStorageMigration();

    migrationPromise.then(() => getEntries().then(setEntries));
    watchEntries((entries) => {
      setEntries(entries);
      updateContextMenus();
    });

    getFavoriteEntryIds().then(setFavoriteEntryIds);
    watchFavoriteEntryIds((favoriteEntryIds) => {
      setFavoriteEntryIds(favoriteEntryIds);
      updateContextMenus();
    });

    getEntryIdToTags().then(setEntryIdToTags);
    watchEntryIdToTags((entryIdToTags) => {
      setEntryIdToTags(entryIdToTags);
      updateContextMenus();
    });

    getChangelogViewedAt().then(setChangelogViewedAt);
    watchChangelogViewedAt(setChangelogViewedAt);

    getClipboardMonitorIsEnabled().then(setClipboardMonitorIsEnabled);
    watchClipboardMonitorIsEnabled(setClipboardMonitorIsEnabled);

    getClipboardSnapshot().then(setClipboardSnapshot);
    watchClipboardSnapshot(setClipboardSnapshot);

    getEntryCommands().then(setEntryCommands);
    watchEntryCommands(setEntryCommands);

    getRefreshToken().then(setRefreshToken);
    watchRefreshToken(setRefreshToken);

    getSettings().then((settings) => {
      setSettings(settings);
      setTab(settings.defaultTab);
    });
    watchSettings(setSettings);
  }, []);

  const setCommands = useSetAtom(commandsAtom);
  useEffect(() => {
    // Filter out commands without names as they aren't useful to us.
    chrome.commands.getAll((commands) =>
      setCommands(
        commands.flatMap((command) =>
          command.name ? { name: command.name, shortcut: command.shortcut } : [],
        ),
      ),
    );
  }, []);
};
