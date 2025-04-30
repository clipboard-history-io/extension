import {
  Divider,
  Popover,
  rem,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { IconTags } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAllTags } from "~popup/contexts/AllTagsContext";
import { defaultBorderColor, lightOrDark } from "~utils/sx";

import { CommonActionIcon } from "./CommonActionIcon";
import { TagOption } from "./TagOption";

interface Props {
  entryId: string;
}

export const TagSelect = ({ entryId }: Props) => {
  const theme = useMantineTheme();
  const allTags = useAllTags();
  const [opened, handlers] = useDisclosure(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagSearchLowercase = useMemo(() => tagSearch.toLowerCase(), [tagSearch]);
  const matchedTags = allTags
    .slice()
    .sort()
    .filter((tag) => tag.includes(tagSearchLowercase));
  const showCreateTagOption = tagSearch !== "" && !matchedTags.includes(tagSearchLowercase);

  const [focusedTagIndex, setFocusedTagIndex] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened) {
      setTagSearch("");
      setFocusedTagIndex(0);
    }
  }, [opened]);

  useEffect(() => {
    setFocusedTagIndex(0);
  }, [tagSearch]);

  useHotkeys(
    [
      [
        "ArrowUp",
        () =>
          setFocusedTagIndex(
            (prevState) =>
              Math.abs(matchedTags.length + +showCreateTagOption + prevState - 1) %
              (matchedTags.length + +showCreateTagOption),
          ),
      ],
      [
        "ArrowDown",
        () =>
          setFocusedTagIndex(
            (prevState) =>
              Math.abs(matchedTags.length + +showCreateTagOption + prevState + 1) %
              (matchedTags.length + +showCreateTagOption),
          ),
      ],
    ],
    [],
  );

  useEffect(() => {
    scrollAreaRef.current
      ?.querySelectorAll(".tag-option")
      ?.[focusedTagIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedTagIndex]);

  return (
    <Popover
      opened={opened}
      onChange={(opened) => (opened ? handlers.open() : handlers.close())}
      width={200}
      position="bottom-end"
      shadow="md"
    >
      <Popover.Target>
        <CommonActionIcon
          backgroundColor={
            opened
              ? lightOrDark(
                  theme,
                  theme.colors.indigo[1],
                  theme.fn.darken(theme.colors.indigo[9], 0.3),
                )
              : undefined
          }
          onClick={() => handlers.toggle()}
        >
          <IconTags size="1rem" />
        </CommonActionIcon>
      </Popover.Target>
      <Popover.Dropdown
        p={0}
        onClick={(e) => e.stopPropagation()}
        sx={{ cursor: "default", minWidth: "fit-content" }}
      >
        <TextInput
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          size="xs"
          variant="unstyled"
          placeholder="Modify tags..."
          autoFocus
          px="xs"
        />
        <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
        {/* https://github.com/creativetimofficial/material-tailwind/issues/528 */}
        <ScrollArea.Autosize placeholder={undefined} mah={200} p={rem(4)} ref={scrollAreaRef}>
          <Stack spacing={0}>
            {matchedTags.map((tag, i) => (
              <TagOption
                key={tag}
                entryId={entryId}
                tag={tag}
                focused={i === focusedTagIndex}
                onHover={() => setFocusedTagIndex(i)}
                onClose={() => handlers.close()}
              />
            ))}
            {showCreateTagOption && (
              <>
                <Divider
                  sx={(theme) => ({
                    borderColor: defaultBorderColor(theme),
                    ".mantine-Divider-label": {
                      marginTop: 0,
                    },
                  })}
                  label={
                    <Text fz="xs" color="dimmed">
                      Create new tag:
                    </Text>
                  }
                />
                <TagOption
                  entryId={entryId}
                  tag={tagSearchLowercase}
                  focused={focusedTagIndex === matchedTags.length}
                  onHover={() => setFocusedTagIndex(matchedTags.length)}
                  onClose={() => handlers.close()}
                />
              </>
            )}
            {matchedTags.length + +showCreateTagOption === 0 && (
              <Text fz="xs" color="dimmed" align="center">
                Start typing to create a new tag
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
};
