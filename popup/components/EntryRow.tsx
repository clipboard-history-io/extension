import {
  Badge,
  Checkbox,
  Divider,
  Group,
  Popover,
  rem,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconEdit, IconKeyboard } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";

import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { useNow } from "~popup/hooks/useNow";
import {
  clipboardSnapshotAtom,
  commandsAtom,
  entryCommandsAtom,
  settingsAtom,
} from "~popup/states/atoms";
import { updateClipboardSnapshot } from "~storage/clipboardSnapshot";
import type { Entry } from "~types/entry";
import { StorageLocation } from "~types/storageLocation";
import { badgeDateFormatter } from "~utils/date";
import { getEntryTimestamp } from "~utils/entries";
import { createEntry } from "~utils/storage";
import { defaultBorderColor, lightOrDark } from "~utils/sx";

import { EntryCloudAction } from "./cloud/EntryCloudAction";
import { CommonActionIcon } from "./CommonActionIcon";
import { EntryDeleteAction } from "./EntryDeleteAction";
import { EntryFavoriteAction } from "./EntryFavoriteAction";
import { EditEntryModalContent } from "./modals/EditEntryModalContent";
import { ShortcutsModalContent } from "./modals/ShortcutsModalContent";
import { ShortcutBadge } from "./ShortcutBadge";
import { TagBadge } from "./TagBadge";
import { TagSelect } from "./TagSelect";

interface Props {
  entry: Entry;
  selectedEntryIds: Set<string>;
}

export const EntryRow = ({ entry, selectedEntryIds }: Props) => {
  const theme = useMantineTheme();
  const now = useNow();
  const settings = useAtomValue(settingsAtom);
  const entryIdToTags = useEntryIdToTags();
  const entryCommands = useAtomValue(entryCommandsAtom);
  const commands = useAtomValue(commandsAtom);
  const [clipboardSnapshot, setClipboardSnapshot] = useAtom(clipboardSnapshotAtom);

  const commandName = entryCommands.find(
    (entryCommand) => entryCommand.entryId === entry.id,
  )?.commandName;
  const shortcut = commands.find((command) => command.name === commandName)?.shortcut;

  return (
    <Stack
      key={entry.id}
      spacing={0}
      sx={(theme) => ({
        backgroundColor: selectedEntryIds.has(entry.id)
          ? lightOrDark(theme, theme.colors.indigo[0], theme.fn.darken(theme.colors.indigo[9], 0.5))
          : undefined,
        cursor: "pointer",
        ":hover": {
          backgroundColor: selectedEntryIds.has(entry.id)
            ? lightOrDark(
                theme,
                theme.colors.indigo[0],
                theme.fn.darken(theme.colors.indigo[9], 0.5),
              )
            : lightOrDark(theme, theme.colors.gray[0], theme.colors.dark[5]),
        },
      })}
      onClick={async () => {
        // Optimistically update local state with arbitrary updatedAt.
        setClipboardSnapshot({ content: entry.content, updatedAt: 0 });
        await updateClipboardSnapshot(entry.content);
        navigator.clipboard.writeText(entry.content);
        await createEntry(
          entry.content,
          entry.id.length === 36 ? StorageLocation.Enum.Cloud : StorageLocation.Enum.Local,
        );
      }}
    >
      <Group align="center" spacing={0} noWrap px="sm" h={32}>
        <Checkbox
          size="xs"
          sx={(theme) => ({
            ".mantine-Checkbox-input:hover": {
              borderColor: theme.fn.primaryColor(),
            },
          })}
          checked={selectedEntryIds.has(entry.id)}
          onChange={() =>
            selectedEntryIds.has(entry.id)
              ? selectedEntryIds.delete(entry.id)
              : selectedEntryIds.add(entry.id)
          }
          onClick={(e) => e.stopPropagation()}
        />

        <Badge
          color={
            entry.content === clipboardSnapshot?.content
              ? undefined
              : lightOrDark(theme, "gray.5", "dark.4")
          }
          variant="filled"
          w={100}
          sx={{ flexShrink: 0 }}
          size="sm"
          mx="sm"
        >
          {entry.content === clipboardSnapshot?.content
            ? "Copied"
            : badgeDateFormatter(now, new Date(getEntryTimestamp(entry, settings)))}
        </Badge>

        <Text
          fz="xs"
          sx={{
            width: "100%",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* Don't fully render large content. */}
          {entry.content.slice(0, 1000)}
        </Text>
        <Group
          align="center"
          spacing={rem(4)}
          noWrap
          sx={{
            flexShrink: 0,
            maxWidth: 300,
            paddingLeft: rem(8),
          }}
        >
          {entryIdToTags[entry.id]
            ?.slice()
            .sort()
            .slice(0, 3)
            .map((tag) => {
              const MAX_TAG_LENGTH = 7;
              const shouldTruncate = tag.length > MAX_TAG_LENGTH;

              return (
                <Popover key={tag} position="bottom" withArrow withinPortal>
                  <Popover.Target>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <TagBadge
                        tag={shouldTruncate ? `${tag.slice(0, MAX_TAG_LENGTH)}...` : tag}
                        sx={{
                          maxWidth: shouldTruncate ? rem(80) : "auto",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      />
                    </div>
                  </Popover.Target>

                  {shouldTruncate && (
                    <Popover.Dropdown p={4}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <TagBadge sx={{ wordBreak: "break-all" }} tag={tag} />
                      </div>
                    </Popover.Dropdown>
                  )}
                </Popover>
              );
            })}

          {(entryIdToTags[entry.id]?.length || 0) > 3 && (
            <Popover position="bottom" withArrow withinPortal>
              <Popover.Target>
                <Badge
                  size="xs"
                  sx={{
                    cursor: "pointer",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  +{(entryIdToTags[entry.id]?.length || 0) - 3}
                </Badge>
              </Popover.Target>

              <Popover.Dropdown
                p={4}
                sx={{ maxHeight: 200, overflowY: "auto", minWidth: "fit-content" }}
              >
                <Stack spacing={3} align="start">
                  {entryIdToTags[entry.id]
                    ?.slice()
                    .sort()
                    .slice(3)
                    .map((tag) => <TagBadge key={tag} tag={tag} />)}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}

          {shortcut !== undefined && <ShortcutBadge shortcut={shortcut || "Not set"} />}

          <Text
            ff="monospace"
            color="dimmed"
            fz={10}
            sx={{
              userSelect: "none",
              marginLeft: "auto",
              paddingLeft: rem(8),
            }}
          >
            {entry.content.length}
          </Text>
        </Group>

        <Group align="center" spacing={0} noWrap ml={rem(4)}>
          <TagSelect entryId={entry.id} />
          <CommonActionIcon
            onClick={() =>
              modals.open({
                padding: 0,
                size: "xl",
                withCloseButton: false,
                children: <ShortcutsModalContent entry={entry} />,
              })
            }
          >
            <IconKeyboard size="1rem" />
          </CommonActionIcon>
          <CommonActionIcon
            onClick={() =>
              modals.open({
                padding: 0,
                size: "xl",
                withCloseButton: false,
                children: <EditEntryModalContent entry={entry} />,
              })
            }
          >
            <IconEdit size="1rem" />
          </CommonActionIcon>
          <EntryCloudAction entry={entry} />
          <EntryFavoriteAction entryId={entry.id} />
          <EntryDeleteAction entryId={entry.id} />
        </Group>
      </Group>
      <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
    </Stack>
  );
};
