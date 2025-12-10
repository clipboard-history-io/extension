import { Badge, Button, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { useMemo } from "react";

import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { selectedTagsAtom, tagFilterModeAtom } from "~popup/states/atoms";
import { defaultBorderColor } from "~utils/sx";

export const TagFilter = () => {
  const entries = useEntries();
  const entryIdToTags = useEntryIdToTags();
  const [selectedTags, setSelectedTags] = useAtom(selectedTagsAtom);
  const [filterMode, setFilterMode] = useAtom(tagFilterModeAtom);

  // Συλλέγει όλα τα unique tags και το count τους
  const allTagsWithCount = useMemo(() => {
    const tagCount = new Map<string, number>();
    entries.forEach((entry) => {
      const tags = entryIdToTags[entry.id] || [];
      tags.forEach((tag) => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagCount.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [entries, entryIdToTags]);

  if (allTagsWithCount.length === 0) {
    return null;
  }

  return (
    <Paper
      p="sm"
      mb="sm"
      sx={(theme) => ({
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: defaultBorderColor(theme),
        borderRadius: theme.radius.sm,
      })}
    >
      <Stack spacing="xs">
        <Group align="center" spacing="xs">
          <Text size="xs" color="dimmed" weight={500}>
            🏷️ Filter by tags:
          </Text>
        </Group>

        <Group spacing="xs">
          {allTagsWithCount.map(({ tag, count }) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                size="md"
                variant={isSelected ? "filled" : "outline"}
                sx={(theme) => ({
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: isSelected
                      ? theme.fn.primaryColor()
                      : theme.fn.rgba(theme.fn.primaryColor(), 0.1),
                  },
                })}
                rightSection={
                  isSelected ? <IconX size="0.8rem" style={{ marginLeft: 4 }} /> : null
                }
                onClick={() => {
                  if (isSelected) {
                    setSelectedTags(selectedTags.filter((t) => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
              >
                {tag} ({count})
              </Badge>
            );
          })}

          {selectedTags.length > 0 && (
            <Badge
              size="md"
              color="red"
              variant="outline"
              sx={{ cursor: "pointer" }}
              onClick={() => setSelectedTags([])}
            >
              Clear all
            </Badge>
          )}
        </Group>

        {selectedTags.length > 1 && (
          <>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group spacing="xs" align="center">
              <Text size="xs" color="dimmed">
                Match:
              </Text>
              <Button.Group>
                <Button
                  size="xs"
                  variant={filterMode === "all" ? "filled" : "default"}
                  onClick={() => setFilterMode("all")}
                >
                  ALL tags
                </Button>
                <Button
                  size="xs"
                  variant={filterMode === "any" ? "filled" : "default"}
                  onClick={() => setFilterMode("any")}
                >
                  ANY tag
                </Button>
              </Button.Group>
            </Group>
          </>
        )}
      </Stack>
    </Paper>
  );
};