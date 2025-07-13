import { Badge, Checkbox, Divider, Group, rem, Stack, Text, useMantineTheme } from "@mantine/core";
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
            flex: "1 2 0",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
            userSelect: "none",
            minWidth: 0,
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
            flex: "0 1 auto",
            minWidth: 0,
          }}
        >
          {entryIdToTags[entry.id]
            ?.slice()
            .sort()
            .map((tag) => <TagBadge key={tag} tag={tag} />)}
          {shortcut !== undefined && <ShortcutBadge shortcut={shortcut || "Not set"} />}
        </Group>
        <Text ff="monospace" color="dimmed" fz={10} ml="xs" sx={{ userSelect: "none" }}>
          {entry.content.length}
        </Text>
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
