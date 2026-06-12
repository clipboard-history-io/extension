import { useAtomValue } from "jotai";

import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { searchAtom } from "~popup/states/atoms";
import { isImageContent } from "~utils/imageContent";

export const AllPage = () => {
  const reversedEntries = useEntries();
  const search = useAtomValue(searchAtom);
  const entryIdToTags = useEntryIdToTags();

  return (
    <EntryList
      noEntriesOverlay={
        search.length === 0 ? (
          <NoEntriesOverlay
            title="Your clipboard history is empty"
            subtitle="Copy any text or image to see it here"
          />
        ) : (
          <NoEntriesOverlay title={`No items found for "${search}"`} />
        )
      }
      entries={reversedEntries.filter(
        (entry) =>
          search.length === 0 ||
          // Image content is base64 and would produce false matches.
          (!isImageContent(entry.content) &&
            entry.content.toLowerCase().includes(search.toLowerCase())) ||
          entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase())),
      )}
    />
  );
};
