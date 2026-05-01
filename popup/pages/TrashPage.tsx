import { Group, Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useAtomValue } from "jotai";

import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { searchAtom } from "~popup/states/atoms";
import { permanentlyDeleteEntries } from "~utils/storage";

export const TrashPage = () => {
  const reversedEntries = useEntries();
  const search = useAtomValue(searchAtom);
  const entryIdToTags = useEntryIdToTags();

  const trashEntries = reversedEntries.filter(
    (entry) =>
      entry.isDeleted === true &&
      (search.length === 0 ||
        entry.content.toLowerCase().includes(search.toLowerCase()) ||
        entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase()))),
  );

  return (
    <>
      <Group position="right" mb="xs">
        <Button
          size="xs"
          variant="light"
          color="red"
          disabled={trashEntries.length === 0}
          onClick={() => {
            modals.openConfirmModal({
              title: "Empty Trash",
              children: "Are you sure you want to permanently delete all items in the trash?",
              labels: { confirm: "Empty Trash", cancel: "Cancel" },
              confirmProps: { color: "red", size: "xs" },
              cancelProps: { size: "xs" },
              onConfirm: () => permanentlyDeleteEntries(trashEntries.map((e) => e.id)),
            });
          }}
        >
          Empty Trash
        </Button>
      </Group>
      <EntryList
        isTrashMode
        noEntriesOverlay={
          search.length === 0 ? (
            <NoEntriesOverlay
              title="Trash is empty"
              subtitle="Items you delete will appear here"
            />
          ) : (
            <NoEntriesOverlay title={`No items found for "${search}"`} />
          )
        }
        entries={trashEntries}
      />
    </>
  );
};
