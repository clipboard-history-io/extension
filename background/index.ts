import { match } from "ts-pattern";
import OFFSCREEN_DOCUMENT_PATH from "url:~offscreen.html";

import { handleCreateEntryRequest } from "~background/messages/createEntry";
import {
  getClipboardMonitorIsEnabled,
  setClipboardMonitorIsEnabled,
} from "~storage/clipboardMonitorIsEnabled";
import { getEntryCommands } from "~storage/entryCommands";
import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import { Alarm } from "~types/alarm";
import { DisplayMode } from "~types/displayMode";
import { setActionIconAndBadgeBackgroundColor } from "~utils/actionBadge";
import { watchClipboard, watchCloudEntries } from "~utils/background";
import db from "~utils/db/core";
import { simplePathBasename } from "~utils/simplePath";
import { getEntries } from "~utils/storage";

import { checkTtlAlarmState, removeEntriesNonFavorite } from "./messages/createTtlAlarm";
import { handleUpdateContextMenusRequest } from "./messages/updateContextMenus";
import { handleUpdateDisplayModeRequest } from "./messages/updateDisplayMode";
import { handleUpdateTotalItemsBadgeRequest } from "./messages/updateTotalItemsBadge";

// Firefox MV2 creates a persistent background page that we can use to watch the clipboard.
if (process.env.PLASMO_TARGET === "firefox-mv2") {
  watchClipboard(window, document, getClipboardMonitorIsEnabled, (content) =>
    handleCreateEntryRequest({
      content,
      // Race condition with popup. Adding this delay in the recorded timestamp allows the
      // clipboard monitor to fail to create an entry when racing with the popup. It will succeed
      // on the next interval as long as the popup doesn't write to clipboardSnapshot again.
      timestamp: Date.now() - 2000,
    }),
  );

  watchCloudEntries(window, getRefreshToken, async () => {
    await Promise.all([
      handleUpdateContextMenusRequest(),
      (async () => {
        const entries = await getEntries();

        await handleUpdateTotalItemsBadgeRequest(entries.length);
      })(),
    ]);
  });

  const updateContextMenusAndTotalItemsBadgeRequest = async () => {
    await Promise.all([
      handleUpdateContextMenusRequest(),
      (async () => {
        const entries = await getEntries();

        await handleUpdateTotalItemsBadgeRequest(entries.length);
      })(),
    ]);

    // Retry just in case updating the service worker's reactor status takes some time.
    await new Promise((r) => setTimeout(r, 800));

    await Promise.all([
      handleUpdateContextMenusRequest(),
      (async () => {
        const entries = await getEntries();

        await handleUpdateTotalItemsBadgeRequest(entries.length);
      })(),
    ]);
  };

  window.addEventListener("online", () => updateContextMenusAndTotalItemsBadgeRequest());

  window.addEventListener("offline", () => updateContextMenusAndTotalItemsBadgeRequest());
}

// A global promise to avoid concurrency issues.
let creating: Promise<void> | null = null;
const setupOffscreenDocument = async () => {
  // Firefox MV2 does not support chrome.offscreen.
  if (process.env.PLASMO_TARGET === "firefox-mv2") {
    return;
  }

  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Read text from clipboard.",
    });
    await creating;
    creating = null;
  }
};

const setupAction = async () => {
  const [entries, clipboardMonitorIsEnabled] = await Promise.all([
    getEntries(),
    getClipboardMonitorIsEnabled(),
  ]);

  await Promise.all([
    handleUpdateDisplayModeRequest(),
    handleUpdateTotalItemsBadgeRequest(entries.length),
    setActionIconAndBadgeBackgroundColor(clipboardMonitorIsEnabled),
  ]);
};

if (process.env.PLASMO_TARGET !== "firefox-mv2") {
  // Handle extension icon click - only fires when no popup is set (i.e., in SidePanel mode)
  chrome.action.onClicked.addListener(async (tab) => {
    const settings = await getSettings();

    if (settings.displayMode === DisplayMode.Enum.SidePanel && chrome.sidePanel) {
      // Open as sidebar panel for Chrome
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      } else {
        await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      }
    } else {
      // Defensive: This shouldn't be reached since onClicked only fires when no popup is set,
      // but attempt to open popup if we somehow get here
      chrome.action.openPopup();
    }
  });
}

chrome.runtime.onStartup.addListener(async () => {
  await Promise.all([
    setupOffscreenDocument(),
    setupAction(),
    handleUpdateContextMenusRequest(),
    checkTtlAlarmState(),
  ]);
});

chrome.tabs.onActivated.addListener(async () => {
  await Promise.all([
    setupOffscreenDocument(),
    setupAction(),
    handleUpdateContextMenusRequest(),
    checkTtlAlarmState(),
  ]);
});

chrome.runtime.onSuspend.addListener(async () => {
  // Firefox MV2 does not support chrome.offscreen.
  if (process.env.PLASMO_TARGET === "firefox-mv2") {
    return;
  }

  await chrome.offscreen.closeDocument();
});

chrome.runtime.onInstalled.addListener(async (details) => {
  await Promise.all([
    details.reason === chrome.runtime.OnInstalledReason.INSTALL &&
      setClipboardMonitorIsEnabled(true),
    chrome.runtime.setUninstallURL("https://www.clipboardhistory.io/uninstall-form"),
    setupOffscreenDocument(),
    setupAction(),
    handleUpdateContextMenusRequest(),
  ]);
});

function paste(content: string) {
  document.execCommand("insertText", undefined, content);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab?.id) {
    const entryId = simplePathBasename(info.menuItemId.toString());

    const entry = await match(entryId.length)
      .with(36, async () => {
        const cloudEntriesQuery = await db.queryOnce({
          entries: {
            $: {
              where: {
                id: entryId,
              },
            },
          },
        });

        return cloudEntriesQuery.data.entries[0];
      })
      .otherwise(async () => {
        const entries = await getEntries();

        return entries.find((entry) => entry.id === entryId);
      });

    if (entry?.content) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        func: paste,
        args: [entry.content],
      });
    }
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (tab?.id) {
    const entryCommands = await getEntryCommands();

    const entryId = entryCommands.find(
      (entryCommand) => entryCommand.commandName === command,
    )?.entryId;

    if (!entryId) {
      return;
    }

    const entry = await match(entryId.length)
      .with(36, async () => {
        const cloudEntriesQuery = await db.queryOnce({
          entries: {
            $: {
              where: {
                id: entryId,
              },
            },
          },
        });

        return cloudEntriesQuery.data.entries[0];
      })
      .otherwise(async () => {
        const entries = await getEntries();

        return entries.find((entry) => entry.id === entryId);
      });

    if (entry?.content) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        func: paste,
        args: [entry.content],
      });
    }
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const name = alarm.name;
  if (name === Alarm.Enum.CleanupTtl) {
    await removeEntriesNonFavorite();
  }
});
