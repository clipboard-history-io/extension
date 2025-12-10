import { Group, Stack, Text } from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import { useAtomValue } from "jotai";

import { CommonActionIcon } from "~popup/components/CommonActionIcon";
import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { TagFilter } from "~popup/components/TagFilter";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { useFavoriteEntryIds } from "~popup/contexts/FavoriteEntryIdsContext";
import {
  searchAtom,
  selectedTagsAtom,
  settingsAtom,
  tagFilterModeAtom,
} from "~popup/states/atoms";
import { sortEntriesByOption } from "~utils/entries";

export const FavoritesPage = () => {
  const reversedEntries = useEntries();
  const favoriteEntryIdsSet = useFavoriteEntryIds();
  const search = useAtomValue(searchAtom);
  const settings = useAtomValue(settingsAtom);
  const selectedTags = useAtomValue(selectedTagsAtom);
  const filterMode = useAtomValue(tagFilterModeAtom);
  const entryIdToTags = useEntryIdToTags();

  // Φιλτράρισμα favorites, search και tags
  const filteredEntries = reversedEntries.filter((entry) => {
    // Favorites filter
    if (!favoriteEntryIdsSet.has(entry.id)) return false;

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
      return selectedTags.every((selectedTag) => entryTags.includes(selectedTag));
    } else {
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
              title="You have no favorite items"
              subtitle={
                <Group align="center" spacing={0}>
                  <Text>Mark an item as favorite by clicking on</Text>
                  <CommonActionIcon>
                    <IconStar size="1rem" />
                  </CommonActionIcon>
                </Group>
              }
              description="Favorite items are protected from deletion"
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