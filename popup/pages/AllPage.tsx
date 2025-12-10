import { Stack } from "@mantine/core";
import { useAtomValue } from "jotai";

import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { TagFilter } from "~popup/components/TagFilter";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import {
  searchAtom,
  selectedTagsAtom,
  settingsAtom,
  tagFilterModeAtom,
} from "~popup/states/atoms";
import { sortEntriesByOption } from "~utils/entries";

export const AllPage = () => {
  const reversedEntries = useEntries();
  const search = useAtomValue(searchAtom);
  const settings = useAtomValue(settingsAtom);
  const selectedTags = useAtomValue(selectedTagsAtom);
  const filterMode = useAtomValue(tagFilterModeAtom);
  const entryIdToTags = useEntryIdToTags();

  // Φιλτράρισμα με search και tags
  const filteredEntries = reversedEntries.filter((entry) => {
    // Search filter
    const matchesSearch =
      search.length === 0 ||
      entry.content.toLowerCase().includes(search.toLowerCase()) ||
      entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    // Tag filter
    if (selectedTags.length === 0) return true;

    const entryTags = entryIdToTags[entry.id] || [];

    if (filterMode === "all") {
      // Πρέπει να έχει ΟΛΑ τα επιλεγμένα tags
      return selectedTags.every((selectedTag) => entryTags.includes(selectedTag));
    } else {
      // Πρέπει να έχει ΟΠΟΙΟΔΗΠΟΤΕ από τα επιλεγμένα tags
      return selectedTags.some((selectedTag) => entryTags.includes(selectedTag));
    }
  });

  return (
    <Stack spacing="sm" h="100%">
      <TagFilter />
      <EntryList
        noEntriesOverlay={
          search.length === 0 && selectedTags.length === 0 ? (
            <NoEntriesOverlay
              title="Your clipboard history is empty"
              subtitle="Copy any text to see it here"
            />
          ) : (
            <NoEntriesOverlay
              title={`No items found${search.length > 0 ? ` for "${search}"` : ""}${
                selectedTags.length > 0 ? ` with tags: ${selectedTags.join(", ")}` : ""
              }`}
            />
          )
        }
        entries={sortEntriesByOption(filteredEntries, settings.sortItemsBy)}
      />
    </Stack>
  );
};