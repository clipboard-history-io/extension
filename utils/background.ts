import type { InstaQLEntity } from "@instantdb/core";

import type { AppSchema } from "~instant.schema";

import db from "./db/core";

export const watchClipboard = (
  w: Window,
  d: Document,
  getClipboardMonitorIsEnabled: () => Promise<boolean>,
  cb: (content: string) => Promise<void>,
) => {
  let pushing = false;
  let fetching = false;

  w.addEventListener(
    "paste",
    async (e) => {
      e.preventDefault();

      if (pushing || !e.clipboardData) {
        return;
      }

      const curr = e.clipboardData.getData("text/plain");

      try {
        pushing = true;

        await cb(curr);
      } catch (e) {
        console.log(e);
      } finally {
        pushing = false;
      }
    },
    { capture: true },
  );

  w.setInterval(async () => {
    if (fetching) {
      return;
    }

    try {
      fetching = true;

      if (await getClipboardMonitorIsEnabled()) {
        d.execCommand("paste");
      }
    } catch (e) {
      console.log(e);
    } finally {
      fetching = false;
    }
  }, 800);
};

export const watchCloudEntries = async (
  w: Window,
  getRefreshToken: () => Promise<string | null>,
  cb: (cloudEntries: InstaQLEntity<AppSchema, "entries">[]) => Promise<void>,
) => {
  let watching = false;
  let fetching = false;

  w.setInterval(async () => {
    if (watching || fetching) {
      return;
    }

    try {
      fetching = true;

      const refreshToken = await getRefreshToken();
      if (refreshToken !== null) {
        watching = true;

        db.subscribeQuery(
          {
            entries: {},
          },
          async (cloudEntriesQuery) => {
            // TODO: Potentially just call the callback with an empty array?
            if (!cloudEntriesQuery.data) {
              return;
            }

            await cb(cloudEntriesQuery.data.entries);
          },
        );
      }
    } catch (e) {
      console.log(e);
    } finally {
      fetching = false;
    }
  }, 800);
};
