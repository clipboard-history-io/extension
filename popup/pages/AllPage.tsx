import { useAtomValue } from "jotai";

import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { searchAtom, settingsAtom } from "~popup/states/atoms";
import { sortEntriesByOption } from "~utils/entries";

export const AllPage = () => {
  const reversedEntries = useEntries();
  const search = useAtomValue(searchAtom);
  const settings = useAtomValue(settingsAtom);
  const entryIdToTags = useEntryIdToTags();

  return (
    <EntryList
      noEntriesOverlay={
        search.length === 0 ? (
          <NoEntriesOverlay
            title="Your clipboard history is empty"
            subtitle="Copy any text to see it here"
          />
        ) : (
          <NoEntriesOverlay title={`No items found for "${search}"`} />
        )
      }
      entries={sortEntriesByOption(
        reversedEntries.filter(
          (entry) =>
            search.length === 0 ||
            entry.content.toLowerCase().includes(search.toLowerCase()) ||
            entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase())),
        ),
        settings.sortItemsBy,
      )}
    />
  );
};