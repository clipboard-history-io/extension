import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getSettings } from "~storage/settings";

export type GetLocalImageStorageLimitRequestBody = undefined;

export type GetLocalImageStorageLimitResponseBody = number | null;

const handler: PlasmoMessaging.MessageHandler<
  GetLocalImageStorageLimitRequestBody,
  GetLocalImageStorageLimitResponseBody
> = async (_, res) => {
  res.send((await getSettings()).localImageStorageLimit);
};

export default handler;
