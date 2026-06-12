import { sendToBackground } from "@plasmohq/messaging";

import type {
  CreateEntryRequestBody,
  CreateEntryResponseBody,
} from "~background/messages/createEntry";
import type {
  DispatchEventRequestBody,
  DispatchEventResponseBody,
} from "~background/messages/dispatchEvent";
import type {
  GetClipboardMonitorIsEnabledRequestBody,
  GetClipboardMonitorIsEnabledResponseBody,
} from "~background/messages/getClipboardMonitorIsEnabled";
import type {
  GetLocalImageSizeLimitRequestBody,
  GetLocalImageSizeLimitResponseBody,
} from "~background/messages/getLocalImageSizeLimit";
import type {
  GetRefreshTokenRequestBody,
  GetRefreshTokenResponseBody,
} from "~background/messages/getRefreshToken";
import type {
  UpdateContextMenusRequestBody,
  UpdateContextMenusResponseBody,
} from "~background/messages/updateContextMenus";
import type {
  UpdateTotalItemsBadgeRequestBody,
  UpdateTotalItemsBadgeResponseBody,
} from "~background/messages/updateTotalItemsBadge";
import { watchClipboard, watchCloudEntries } from "~utils/background";

watchClipboard(
  window,
  document,
  () =>
    sendToBackground<
      GetClipboardMonitorIsEnabledRequestBody,
      GetClipboardMonitorIsEnabledResponseBody
    >({
      name: "getClipboardMonitorIsEnabled",
    }),
  () =>
    sendToBackground<GetLocalImageSizeLimitRequestBody, GetLocalImageSizeLimitResponseBody>({
      name: "getLocalImageSizeLimit",
    }),
  async (content) => {
    await sendToBackground<CreateEntryRequestBody, CreateEntryResponseBody>({
      name: "createEntry",
      body: {
        content,
        // Race condition with popup. Adding this delay in the recorded timestamp allows the
        // clipboard monitor to fail to create an entry when racing with the popup. It will succeed
        // on the next interval as long as the popup doesn't write to clipboardSnapshot again.
        timestamp: Date.now() - 2000,
      },
    });
  },
);

watchCloudEntries(
  window,
  () =>
    sendToBackground<GetRefreshTokenRequestBody, GetRefreshTokenResponseBody>({
      name: "getRefreshToken",
    }),
  async () => {
    await Promise.all([
      sendToBackground<UpdateContextMenusRequestBody, UpdateContextMenusResponseBody>({
        name: "updateContextMenus",
      }),
      sendToBackground<UpdateTotalItemsBadgeRequestBody, UpdateTotalItemsBadgeResponseBody>({
        name: "updateTotalItemsBadge",
      }),
    ]);
  },
);

const sendToBackgroundDispatchEvent = async (eventType: string) => {
  await sendToBackground<DispatchEventRequestBody, DispatchEventResponseBody>({
    name: "dispatchEvent",
    body: {
      eventType,
    },
  });

  await Promise.all([
    sendToBackground<UpdateContextMenusRequestBody, UpdateContextMenusResponseBody>({
      name: "updateContextMenus",
    }),
    sendToBackground<UpdateTotalItemsBadgeRequestBody, UpdateTotalItemsBadgeResponseBody>({
      name: "updateTotalItemsBadge",
    }),
  ]);

  // Retry just in case updating the service worker's reactor status takes some time.
  await new Promise((r) => setTimeout(r, 800));

  await Promise.all([
    sendToBackground<UpdateContextMenusRequestBody, UpdateContextMenusResponseBody>({
      name: "updateContextMenus",
    }),
    sendToBackground<UpdateTotalItemsBadgeRequestBody, UpdateTotalItemsBadgeResponseBody>({
      name: "updateTotalItemsBadge",
    }),
  ]);
};

window.addEventListener("online", () => sendToBackgroundDispatchEvent("online"));

window.addEventListener("offline", () => sendToBackgroundDispatchEvent("offline"));
