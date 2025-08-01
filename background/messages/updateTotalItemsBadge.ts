import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import { removeActionBadgeText, setActionBadgeText } from "~utils/actionBadge";
import db from "~utils/db/core";
import { getEntries } from "~utils/storage";

export type UpdateTotalItemsBadgeRequestBody = undefined;

// https://www.totaltypescript.com/the-empty-object-type-in-typescript#representing-an-empty-object
export type UpdateTotalItemsBadgeResponseBody = Record<PropertyKey, never>;

export const handleUpdateTotalItemsBadgeRequest = async (totalLocalEntries: number) => {
  const [settings, refreshToken, user] = await Promise.all([
    getSettings(),
    getRefreshToken(),
    db.getAuth(),
  ]);

  if (!settings.totalItemsBadge) {
    await removeActionBadgeText();
    return;
  }

  if (refreshToken === null || user === null || db._reactor.status === "closed") {
    await setActionBadgeText(totalLocalEntries);
    return;
  }

  let totalEntries = totalLocalEntries;

  try {
    const cloudEntriesQuery = await db.queryOnce({
      entries: {},
    });

    totalEntries += cloudEntriesQuery.data.entries.length;
  } catch (e) {
    console.log(e);
  }

  await setActionBadgeText(totalEntries);
};

const handler: PlasmoMessaging.MessageHandler<
  UpdateTotalItemsBadgeRequestBody,
  UpdateTotalItemsBadgeResponseBody
> = async (_, res) => {
  const entries = await getEntries();

  await handleUpdateTotalItemsBadgeRequest(entries.length);

  res.send({});
};

export default handler;
