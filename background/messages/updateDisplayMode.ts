import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getSettings } from "~storage/settings";
import { DisplayMode } from "~types/displayMode";

export type UpdateDisplayModeRequestBody = undefined;

// https://www.totaltypescript.com/the-empty-object-type-in-typescript#representing-an-empty-object
export type UpdateDisplayModeResponseBody = Record<PropertyKey, never>;

export const handleUpdateDisplayModeRequest = async () => {
  if (process.env.PLASMO_TARGET === "firefox-mv2") {
    return;
  }

  const settings = await getSettings();

  // Configure popup or sidepanel based on settings
  if (settings.displayMode === DisplayMode.Enum.SidePanel && chrome.sidePanel) {
    // Remove popup to enable onClicked handler
    await chrome.action.setPopup({ popup: "" });
    // Enable clicking extension icon to open sidepanel
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    // Set the sidepanel path with ref parameter
    await chrome.sidePanel.setOptions({
      path: "popup.html?ref=sidepanel",
      enabled: true,
    });
  } else {
    // Set popup for normal mode
    await chrome.action.setPopup({ popup: "popup.html" });
    if (chrome.sidePanel) {
      // Disable sidepanel opening on icon click
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      await chrome.sidePanel.setOptions({
        enabled: false,
      });
    }
  }
};

const handler: PlasmoMessaging.MessageHandler<
  UpdateDisplayModeRequestBody,
  UpdateDisplayModeResponseBody
> = async (_, res) => {
  await handleUpdateDisplayModeRequest();
  res.send({});
};

export default handler;
