import { z } from "zod";

import { DisplayMode } from "./displayMode";
import { ItemSortOption } from "./itemSortOption";
import { StorageLocation } from "./storageLocation";
import { Tab } from "./tab";

// DO NOT REUSE DEPRECATED FIELDS.
export const defaultSettings = {
  sortItemsBy: ItemSortOption.Enum.DateLastCopied,
  storageLocation: StorageLocation.Enum.Local,
  totalItemsBadge: true,
  pasteFromContextMenu: true,
  changelogIndicator: true,
  allowBlankItems: true,
  defaultTab: Tab.Enum.All,
  // theme: "light",
  themeV2: "system",
  localItemLimit: null,
  localItemCharacterLimit: null,
  // Total decoded bytes of non-favorited images. Also caps individual image size: an image larger
  // than the whole budget can never be stored, so it's ignored at capture time.
  localImageStorageLimit: 20 * 1024 * 1024,
  displayMode: DisplayMode.Enum.Popup,
};

export const Settings = z
  .object({
    sortItemsBy: ItemSortOption.default(defaultSettings.sortItemsBy),
    storageLocation: StorageLocation.default(defaultSettings.storageLocation),
    totalItemsBadge: z.boolean().default(defaultSettings.totalItemsBadge),
    pasteFromContextMenu: z.boolean().default(defaultSettings.pasteFromContextMenu),
    changelogIndicator: z.boolean().default(defaultSettings.changelogIndicator),
    allowBlankItems: z.boolean().default(defaultSettings.allowBlankItems),
    defaultTab: Tab.default(defaultSettings.defaultTab),
    // theme: z.string().default(defaultSettings.theme),
    themeV2: z.string().default(defaultSettings.themeV2),
    localItemLimit: z.number().nullable().default(defaultSettings.localItemLimit),
    localItemCharacterLimit: z.number().nullable().default(defaultSettings.localItemCharacterLimit),
    localImageStorageLimit: z.number().nullable().default(defaultSettings.localImageStorageLimit),
    displayMode: DisplayMode.default(defaultSettings.displayMode),
  })
  .default(defaultSettings);
export type Settings = z.infer<typeof Settings>;
