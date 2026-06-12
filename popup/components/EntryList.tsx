import { Box, Checkbox, Divider, Group, rem, Stack, Text, Title, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconFold, IconStar, IconTrash } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import { useFavoriteEntryIds } from "~popup/contexts/FavoriteEntryIdsContext";
import { useEntryListNavigation } from "~popup/hooks/useEntryListNavigation";
import { useSet } from "~popup/hooks/useSet";
import { searchAtom } from "~popup/states/atoms";
import { handleMutation } from "~popup/utils/mutation";
import { addFavoriteEntryIds, deleteFavoriteEntryIds } from "~storage/favoriteEntryIds";
import type { Entry } from "~types/entry";
import { deleteEntries } from "~utils/storage";
import { defaultBorderColor } from "~utils/sx";

import { CommonActionIcon } from "./CommonActionIcon";
import { EntryRow } from "./EntryRow";
import { KeyboardHint } from "./KeyboardHint";
import { MergeModalContent } from "./modals/MergeModalContent";

interface Props {
  entries: Entry[];
  noEntriesOverlay: ReactNode;
}

const EntryRowRenderer = ({
  data,
  index,
  style,
}: {
  data: {
    entries: Entry[];
    selectedEntryIds: Set<string>;
    selectedEntryIndex: number;
  };
  index: number;
  style: CSSProperties;
}) => {
  const entry = data.entries[index]!;

  return (
    <Box style={style}>
      <EntryRow
        entry={entry}
        selectedEntryIds={data.selectedEntryIds}
        isKeyboardSelected={index === data.selectedEntryIndex}
      />
    </Box>
  );
};

export const EntryList = ({ entries, noEntriesOverlay }: Props) => {
  const favoriteEntryIdsSet = useFavoriteEntryIds();
  const search = useAtomValue(searchAtom);
  const { listRef, selectedEntryIndex } = useEntryListNavigation(entries);

  const selectedEntryIds = useSet<string>();
  const entryIdsStringified = useMemo(() => JSON.stringify(entries.map(({ id }) => id)), [entries]);

  useEffect(() => {
    selectedEntryIds.clear();
  }, [entryIdsStringified]);

  return (
    <Stack
      h="100%"
      spacing={0}
      sx={(theme) => ({
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: defaultBorderColor(theme),
        borderRadius: theme.radius.sm,
      })}
    >
      <Group align="center" spacing="sm" noWrap px="sm" h={32}>
        <Checkbox
          size="xs"
          sx={(theme) => ({
            ".mantine-Checkbox-input:hover": {
              borderColor: theme.fn.primaryColor(),
            },
          })}
          checked={selectedEntryIds.size > 0 && selectedEntryIds.size === entries.length}
          indeterminate={selectedEntryIds.size > 0 && selectedEntryIds.size < entries.length}
          onChange={() =>
            selectedEntryIds.size === 0
              ? entries.forEach((entry) => selectedEntryIds.add(entry.id))
              : selectedEntryIds.clear()
          }
        />
        <Group align="center" w="100%" position="apart">
          <Group align="center" spacing={0}>
            <Tooltip label={<Text fz="xs">Favorite</Text>} disabled={selectedEntryIds.size === 0}>
              <CommonActionIcon
                disabled={selectedEntryIds.size === 0}
                onClick={handleMutation(() =>
                  Array.from(selectedEntryIds).every((selectedEntryId) =>
                    favoriteEntryIdsSet.has(selectedEntryId),
                  )
                    ? deleteFavoriteEntryIds(Array.from(selectedEntryIds))
                    : addFavoriteEntryIds(Array.from(selectedEntryIds)),
                )}
              >
                <IconStar size="1rem" />
              </CommonActionIcon>
            </Tooltip>
            <Tooltip label={<Text fz="xs">Delete</Text>} disabled={selectedEntryIds.size === 0}>
              <CommonActionIcon
                disabled={selectedEntryIds.size === 0}
                onClick={() =>
                  modals.openConfirmModal({
                    title: <Title order={5}>Delete Items</Title>,
                    children: (
                      <Text fz="xs" mb="xs">
                        Are you sure you want to delete all selected items? Favorited items will not
                        be deleted.
                      </Text>
                    ),
                    labels: { confirm: "Delete", cancel: "Cancel" },
                    confirmProps: { color: "red", size: "xs" },
                    cancelProps: { size: "xs" },
                    onConfirm: handleMutation(() =>
                      deleteEntries(
                        Array.from(selectedEntryIds).filter(
                          (selectedEntryId) => !favoriteEntryIdsSet.has(selectedEntryId),
                        ),
                      ),
                    ),
                  })
                }
              >
                <IconTrash size="1rem" />
              </CommonActionIcon>
            </Tooltip>
            {/* https://github.com/clauderic/dnd-kit/issues/1043 */}
            {process.env.PLASMO_TARGET !== "firefox-mv2" && (
              <Tooltip label={<Text fz="xs">Merge</Text>} disabled={selectedEntryIds.size < 2}>
                <CommonActionIcon
                  disabled={selectedEntryIds.size < 2}
                  onClick={() =>
                    modals.open({
                      padding: 0,
                      size: "xl",
                      withCloseButton: false,
                      children: (
                        <MergeModalContent
                          initialEntries={entries.filter((entry) => selectedEntryIds.has(entry.id))}
                        />
                      ),
                    })
                  }
                >
                  <IconFold size="1rem" />
                </CommonActionIcon>
              </Tooltip>
            )}
          </Group>
          <Text fz="xs">
            {selectedEntryIds.size} of {entries.length} selected
          </Text>
        </Group>
      </Group>
      <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
      <Box sx={{ flex: "auto" }}>
        {entries.length === 0 ? (
          noEntriesOverlay
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <FixedSizeList
                ref={listRef}
                height={height}
                width={width}
                itemData={{ entries, selectedEntryIds, selectedEntryIndex }}
                itemCount={entries.length}
                itemSize={33}
              >
                {EntryRowRenderer}
              </FixedSizeList>
            )}
          </AutoSizer>
        )}
      </Box>
      {(entries.length > 0 || search.length > 0) && (
        <>
          <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
          {/* The extra padding offsets the list viewport so its overflow cut lands mid-row
              instead of on a row divider, which would stack against the divider above. */}
          <Group align="center" spacing="md" noWrap px="sm" py={rem(8)}>
            {entries.length > 0 && (
              <>
                <KeyboardHint keys={["↑", "↓"]} label="Navigate" />
                <KeyboardHint keys={["↵"]} label="Copy" />
              </>
            )}
            {search.length > 0 && <KeyboardHint keys={["Esc"]} label="Clear search" />}
          </Group>
        </>
      )}
    </Stack>
  );
};
