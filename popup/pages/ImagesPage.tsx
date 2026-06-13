import { useAtomValue } from "jotai";

import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { searchAtom } from "~popup/states/atoms";
import { isImageContent } from "~utils/imageContent";

export const ImagesPage = () => {
  const reversedEntries = useEntries();
  const search = useAtomValue(searchAtom);
  const entryIdToTags = useEntryIdToTags();

  return (
    <EntryList
      noEntriesOverlay={
        search.length === 0 ? (
          <NoEntriesOverlay title="You have no images" subtitle="Copy an image to see it here" />
        ) : (
          <NoEntriesOverlay title={`No items found for "${search}"`} />
        )
      }
      entries={reversedEntries.filter(
        (entry) =>
          isImageContent(entry.content) &&
          // Image content is base64, so only tags are searchable.
          (search.length === 0 ||
            entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase()))),
      )}
    />
  );
};
