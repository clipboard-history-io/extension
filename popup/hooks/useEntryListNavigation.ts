import { useModals } from "@mantine/modals";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FixedSizeList } from "react-window";

import { searchAtom } from "~popup/states/atoms";
import type { Entry } from "~types/entry";

import { useCopyEntry } from "./useCopyEntry";

// The navigation keydown listener ignores keystrokes from text entry targets so it doesn't
// hijack other inputs, with the search input as the one exception so entries can be navigated
// and copied without ever leaving it.
export const SEARCH_INPUT_ID = "entry-search-input";

const isTextEntryTarget = (target: HTMLElement) =>
  target.isContentEditable ||
  target.tagName === "TEXTAREA" ||
  target.tagName === "SELECT" ||
  (target.tagName === "INPUT" &&
    !["checkbox", "radio"].includes((target as HTMLInputElement).type));

export const useEntryListNavigation = (entries: Entry[]) => {
  const modals = useModals();
  const [search, setSearch] = useAtom(searchAtom);
  const copyEntry = useCopyEntry();

  const listRef = useRef<FixedSizeList>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string>();

  // The selection defaults to the most relevant entry (the top one) and follows the selected
  // entry through reorders. If the selected entry disappears the selection falls back to the
  // top instead of jumping to an arbitrary neighbor.
  const selectedEntryIndex = useMemo(() => {
    if (selectedEntryId === undefined) {
      return 0;
    }

    return Math.max(
      entries.findIndex((entry) => entry.id === selectedEntryId),
      0,
    );
  }, [entries, selectedEntryId]);

  // Reset the selection to the top whenever the query changes so the best match is always one
  // enter away.
  useEffect(() => {
    setSelectedEntryId(undefined);
    listRef.current?.scrollToItem(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let the IME consume keystrokes while composing.
      if (e.isComposing) {
        return;
      }

      // Modals and dropdowns (tag selects, menus) own the keyboard while open.
      if (
        modals.modals.length > 0 ||
        document.querySelector(".mantine-Popover-dropdown, .mantine-Menu-dropdown") !== null
      ) {
        return;
      }

      const target = e.target instanceof HTMLElement ? e.target : null;

      if (target !== null && target.id !== SEARCH_INPUT_ID && isTextEntryTarget(target)) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (entries.length === 0) {
          return;
        }

        e.preventDefault();

        const delta = e.key === "ArrowDown" ? 1 : -1;
        const index = (selectedEntryIndex + delta + entries.length) % entries.length;
        const entry = entries[index];

        if (entry !== undefined) {
          setSelectedEntryId(entry.id);
          listRef.current?.scrollToItem(index);
        }

        return;
      }

      if (e.key === "Enter") {
        // Buttons and links act on enter themselves.
        if (target?.closest("button, a") != null) {
          return;
        }

        const entry = entries[selectedEntryIndex];

        if (entry !== undefined) {
          e.preventDefault();
          copyEntry(entry);
        }

        return;
      }

      if (e.key === "Escape" && search.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setSearch("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [entries, selectedEntryIndex, search, modals.modals.length, copyEntry, setSearch]);

  return { listRef, selectedEntryIndex };
};
