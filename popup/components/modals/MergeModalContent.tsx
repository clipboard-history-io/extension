import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Card,
  Checkbox,
  CloseButton,
  Group,
  Paper,
  rem,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconArrowsSort } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { forwardRef, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { FixedSizeList } from "react-window";
import { z } from "zod";

import { useFavoriteEntryIds } from "~popup/contexts/FavoriteEntryIdsContext";
import { settingsAtom } from "~popup/states/atoms";
import { handleMutation } from "~popup/utils/mutation";
import { updateClipboardSnapshot } from "~storage/clipboardSnapshot";
import type { Entry } from "~types/entry";
import { createEntry, deleteEntries } from "~utils/storage";

import { Draggable } from "../Draggable";
import { MergeItem } from "../MergeItem";

// https://github.com/bvaughn/react-window?tab=readme-ov-file#can-i-add-padding-to-the-top-and-bottom-of-a-list
const PADDING_SIZE = 4;

const schema = z.object({
  deleteSourceItems: z.boolean(),
  delimiter: z.string(),
  customDelimiter: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  initialEntries: Entry[];
}

const DraggableMergeItemRenderer = ({
  data,
  index,
  style,
}: {
  data: {
    entries: Entry[];
    activeEntryId: string | null;
  };
  index: number;
  style: CSSProperties;
}) => {
  const entry = data.entries[index]!;

  return (
    <Box
      style={{
        ...style,
        top: `${parseFloat((style.top || 0).toString()) + PADDING_SIZE}px`,
      }}
    >
      <Draggable id={entry.id}>
        <MergeItem entry={entry} i={index + 1} hidden={entry.id === data.activeEntryId} />
      </Draggable>
    </Box>
  );
};

export const MergeModalContent = ({ initialEntries }: Props) => {
  const favoriteEntryIdsSet = useFavoriteEntryIds();
  const settings = useAtomValue(settingsAtom);

  const {
    control,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      deleteSourceItems: false,
      delimiter: "\n",
      customDelimiter: "",
    },
    resolver: zodResolver(schema),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const [entries, setEntries] = useState(initialEntries);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeEntryId),
    [entries, activeEntryId],
  );

  return (
    <Paper p="md">
      <Group align="center" position="apart" mb="xs">
        <Title order={5}>Merge Items</Title>
        <CloseButton onClick={() => modals.closeAll()} />
      </Group>
      <form
        onSubmit={handleSubmit(async ({ deleteSourceItems, delimiter, customDelimiter }) => {
          const selectedDelimiter = delimiter === "custom" ? customDelimiter : delimiter;
          const content = entries.map(({ content }) => content).join(selectedDelimiter);

          // Same as clicking on a row.
          await updateClipboardSnapshot(content);
          navigator.clipboard.writeText(content);
          await createEntry(content, settings.storageLocation);

          if (deleteSourceItems) {
            await handleMutation(() =>
              deleteEntries(
                // Map entries to ids and filter out favorites.
                entries.flatMap(({ id }) => (favoriteEntryIdsSet.has(id) ? [] : id)),
              ),
            )();
          }

          modals.closeAll();
        })}
      >
        <Stack spacing="xs">
          <Group align="center" position="apart">
            <Text size="xs">
              <Text color="dimmed" span>
                Merging
              </Text>
              <> </>
              <Text fw={700} span>
                {entries.length} items
              </Text>
            </Text>
            <UnstyledButton
              onClick={() => setEntries((prevState) => prevState.slice().reverse())}
              sx={(theme) => ({
                color: theme.fn.primaryColor(),
              })}
            >
              <Group align="center" spacing={rem(4)}>
                <IconArrowsSort size="0.8rem" />
                <Text size="xs" fw={500} span>
                  Inverse order
                </Text>
              </Group>
            </UnstyledButton>
          </Group>
          <Card p={0} shadow="none" withBorder>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => setActiveEntryId(event.active.id.toString())}
              // https://docs.dndkit.com/presets/sortable#overview
              onDragEnd={(event) => {
                const { active, over } = event;

                if (active && over && active.id !== over.id) {
                  setEntries((prevState) => {
                    const oldIndex = prevState.findIndex(
                      // toString is needed because active.id isn't implicitly typed.
                      (entry) => entry.id === active.id.toString(),
                    );
                    const newIndex = prevState.findIndex(
                      // toString is needed because active.id isn't implicitly typed.
                      (entry) => entry.id === over.id.toString(),
                    );

                    return arrayMove(prevState, oldIndex, newIndex);
                  });
                }

                setActiveEntryId(null);
              }}
            >
              <SortableContext items={entries} strategy={verticalListSortingStrategy}>
                <FixedSizeList
                  height={Math.min(entries.length, 8) * 32 + 8}
                  width="100%"
                  itemData={{ entries, activeEntryId }}
                  itemCount={entries.length}
                  itemSize={32}
                  innerElementType={forwardRef(({ style, ...rest }, ref) => (
                    <Box
                      ref={ref}
                      style={{
                        ...style,
                        height: `${parseFloat(style.height) + PADDING_SIZE * 2}px`,
                      }}
                      {...rest}
                    />
                  ))}
                >
                  {DraggableMergeItemRenderer}
                </FixedSizeList>
              </SortableContext>
              {createPortal(
                <DragOverlay>
                  {activeEntry && (
                    <MergeItem
                      entry={activeEntry}
                      i={entries.findIndex((entry) => entry.id === activeEntryId) + 1}
                      grabbing={true}
                    />
                  )}
                </DragOverlay>,
                document.body,
              )}
            </DndContext>
          </Card>
          <Group align="center" position="apart">
            <Controller
              name="deleteSourceItems"
              control={control}
              render={({ field }) => (
                <Checkbox
                  // Don't forward field.value.
                  {...{ ...field, value: undefined }}
                  checked={field.value}
                  label="Delete source items"
                  size="xs"
                  sx={(theme) => ({
                    ".mantine-Checkbox-input:hover": {
                      borderColor: theme.fn.primaryColor(),
                    },
                  })}
                />
              )}
            />
            <Group align="center" spacing="xs">
              <Text size="xs" color="dimmed">
                Delimiter
              </Text>
              <Controller
                control={control}
                name="delimiter"
                render={({ field }) => (
                  <Select
                    {...field}
                    data={[
                      { value: "\n", label: "Newline (\\n)" },
                      { value: ",", label: "Comma (,)" },
                      { value: ";", label: "Semicolon (;)" },
                      { value: " ", label: "Space ( )" },
                      { value: "\t", label: "Tab (\\t)" },
                      { value: "", label: "None" },
                      { value: "custom", label: "Custom..." },
                    ]}
                    size="xs"
                    withinPortal
                  />
                )}
              />
            </Group>
          </Group>
          {watch("delimiter") === "custom" && (
            <Controller
              control={control}
              name="customDelimiter"
              render={({ field }) => (
                <Textarea
                  {...field}
                  label={
                    <Text size="xs" color="dimmed" fw="normal">
                      Custom Delimiter
                    </Text>
                  }
                  autosize
                  size="xs"
                />
              )}
            />
          )}
          <Button type="submit" size="xs" loading={isSubmitting} fullWidth>
            Merge
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};
