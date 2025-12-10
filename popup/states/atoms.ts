import { atom } from "jotai";

import { ClipboardSnapshot } from "~types/clipboardSnapshot";
import { Entry } from "~types/entry";
import type { EntryCommand } from "~types/entryCommand";
import { EntryIdToTags } from "~types/entryIdToTags";
import { defaultSettings, Settings } from "~types/settings";
import type { StorageUsage } from "~types/storageUsage";
import { Tab } from "~types/tab";

export const searchAtom = atom<string>("");
export const tabAtom = atom<Tab>(Tab.Enum.All);
export const transitioningEntryContentHashAtom = atom<string>();

export const clipboardMonitorIsEnabledAtom = atom<boolean>();

export const entriesAtom = atom<Entry[]>([]);

export const clipboardSnapshotAtom = atom<ClipboardSnapshot>();

export const favoriteEntryIdsAtom = atom<string[]>([]);

export const settingsAtom = atom<Settings>(defaultSettings);

export const staticNowAtom = atom(() => new Date());

export const entryIdToTagsAtom = atom<EntryIdToTags>({});

export const changelogViewedAtAtom = atom<string>();

export const entryCommandsAtom = atom<EntryCommand[]>([]);
export const commandsAtom = atom<{ name: string; shortcut?: string }[]>([]);

export const refreshTokenAtom = atom<string | null>();

export const storageUsageAtom = atom<StorageUsage>();

export const selectedTagsAtom = atom<string[]>([]);
export const tagFilterModeAtom = atom<'all' | 'any'>('all');