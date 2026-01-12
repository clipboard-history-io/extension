import { useAtomValue } from "jotai";
import { createContext, useContext, type PropsWithChildren } from "react";

import { useCloudEntriesQuery } from "~popup/hooks/useCloudEntriesQuery";
import { entriesAtom, settingsAtom, transitioningEntryContentHashAtom } from "~popup/states/atoms";
import type { Entry } from "~types/entry";
import db from "~utils/db/react";
import { getEntryTimestamp } from "~utils/entries";

const EntriesContext = createContext<Entry[]>([]);

export const EntriesProvider = ({ children }: PropsWithChildren) => {
  const connectionStatus = db.useConnectionStatus();
  const settings = useAtomValue(settingsAtom);
  const transitioningEntryContentHash = useAtomValue(transitioningEntryContentHashAtom);
  const entries = useAtomValue(entriesAtom);
  const cloudEntriesQuery = useCloudEntriesQuery();
  const cloudEntries = connectionStatus === "closed" ? [] : cloudEntriesQuery.data?.entries || [];

  const sortedEntries = entries
    .slice()
    .sort((a, b) => getEntryTimestamp(a, settings) - getEntryTimestamp(b, settings));
  const sortedCloudEntries = cloudEntries
    .slice()
    .sort((a, b) => getEntryTimestamp(a, settings) - getEntryTimestamp(b, settings));

  let i = sortedEntries.length - 1;
  let j = sortedCloudEntries.length - 1;
  const out: Entry[] = [];

  while (i >= 0 && j >= 0) {
    const entry = sortedEntries[i]!;
    const cloudEntry = sortedCloudEntries[j]!;

    if (getEntryTimestamp(entry, settings) > getEntryTimestamp(cloudEntry, settings)) {
      out.push(entry);
      i--;
    } else if (getEntryTimestamp(entry, settings) < getEntryTimestamp(cloudEntry, settings)) {
      out.push(cloudEntry);
      j--;
    } else if (
      entry.id === cloudEntry.emailContentHash.split("+").at(-1) &&
      transitioningEntryContentHash === entry.id
    ) {
      i--;
    } else {
      out.push(cloudEntry);
      j--;
    }
  }

  while (i >= 0) {
    const entry = sortedEntries[i]!;
    out.push(entry);
    i--;
  }

  while (j >= 0) {
    const cloudEntry = sortedCloudEntries[j]!;
    out.push(cloudEntry);
    j--;
  }

  return <EntriesContext.Provider value={out}>{children}</EntriesContext.Provider>;
};

export const useEntries = () => {
  return useContext(EntriesContext);
};
