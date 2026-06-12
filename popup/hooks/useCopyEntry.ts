import { useSetAtom } from "jotai";
import { useCallback } from "react";

import { clipboardSnapshotAtom } from "~popup/states/atoms";
import { updateClipboardSnapshot } from "~storage/clipboardSnapshot";
import type { Entry } from "~types/entry";
import { StorageLocation } from "~types/storageLocation";
import { createEntry } from "~utils/storage";

export const useCopyEntry = () => {
  const setClipboardSnapshot = useSetAtom(clipboardSnapshotAtom);

  return useCallback(
    async (entry: Entry) => {
      // Optimistically update local state with arbitrary updatedAt.
      setClipboardSnapshot({ content: entry.content, updatedAt: 0 });

      await updateClipboardSnapshot(entry.content);
      navigator.clipboard.writeText(entry.content);
      await createEntry(
        entry.content,
        entry.id.length === 36 ? StorageLocation.Enum.Cloud : StorageLocation.Enum.Local,
      );
    },
    [setClipboardSnapshot],
  );
};
