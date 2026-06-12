import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getSettings } from "~storage/settings";

export type GetLocalImageSizeLimitRequestBody = undefined;

export type GetLocalImageSizeLimitResponseBody = number | null;

const handler: PlasmoMessaging.MessageHandler<
  GetLocalImageSizeLimitRequestBody,
  GetLocalImageSizeLimitResponseBody
> = async (_, res) => {
  res.send((await getSettings()).localImageSizeLimit);
};

export default handler;
