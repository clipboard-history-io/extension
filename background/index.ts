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
import { setActionIconAndBadgeBackgroundColor } from "~utils/actionBadge";
import { watchClipboard, watchCloudEntries } from "~utils/background";
import db from "~utils/db/core";
import { simplePathBasename } from "~utils/simplePath";
import { getEntries } from "~utils/storage";

import { handleUpdateContextMenusRequest } from "./messages/updateContextMenus";
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
    getSettings(),
  ]);

  await Promise.all([
    handleUpdateTotalItemsBadgeRequest(entries.length),
    setActionIconAndBadgeBackgroundColor(clipboardMonitorIsEnabled),
  ]);
};

chrome.runtime.onStartup.addListener(async () => {
  await Promise.all([setupOffscreenDocument(), setupAction(), handleUpdateContextMenusRequest()]);
});

chrome.tabs.onActivated.addListener(async () => {
  await Promise.all([setupOffscreenDocument(), setupAction(), handleUpdateContextMenusRequest()]);
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
    chrome.runtime.setUninstallURL("https://www.clipboardhistory.io/uninstall"),
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
