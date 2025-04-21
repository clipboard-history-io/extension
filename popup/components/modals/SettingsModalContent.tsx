import { zodResolver } from "@hookform/resolvers/zod";
import {
  Anchor,
  Badge,
  Box,
  Button,
  CloseButton,
  Divider,
  FileInput,
  Group,
  Indicator,
  NumberInput,
  Paper,
  rem,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconAppWindow,
  IconDatabase,
  IconDeviceFloppy,
  IconFileExport,
  IconFileImport,
  IconUpload,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { sendToBackground } from "@plasmohq/messaging";

import type {
  UpdateContextMenusRequestBody,
  UpdateContextMenusResponseBody,
} from "~background/messages/updateContextMenus";
import type {
  UpdateTotalItemsBadgeRequestBody,
  UpdateTotalItemsBadgeResponseBody,
} from "~background/messages/updateTotalItemsBadge";
import { settingsAtom } from "~popup/states/atoms";
import { setSettings } from "~storage/settings";
import { ItemSortOption } from "~types/itemSortOption";
import { StorageLocation } from "~types/storageLocation";
import { Tab } from "~types/tab";
import db from "~utils/db/react";
import { getClipboardHistoryIOExport, importFile } from "~utils/importExport";
import { capitalize } from "~utils/string";
import { defaultBorderColor, lightOrDark } from "~utils/sx";

const schema = z.object({
  localItemLimit: z.number().min(1).nullable(),
  localItemCharacterLimit: z.number().min(1).nullable(),
});
type FormValues = z.infer<typeof schema>;

export const SettingsModalContent = () => {
  const theme = useMantineTheme();
  const auth = db.useAuth();
  const settings = useAtomValue(settingsAtom);
  const systemColorScheme = useColorScheme();

  const [file, setFile] = useState<File | null>(null);

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      localItemLimit: settings.localItemLimit,
      localItemCharacterLimit: settings.localItemCharacterLimit,
    },
    mode: "all",
    resolver: zodResolver(schema),
  });

  return (
    <Paper p="md">
      <Group align="center" position="apart" mb="xs">
        <Title order={5}>Settings</Title>
        <CloseButton onClick={() => modals.closeAll()} />
      </Group>
      <Tabs defaultValue="general">
        <Tabs.List>
          <Tabs.Tab value="general" icon={<IconAdjustmentsHorizontal size="0.8rem" />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="interface" icon={<IconAppWindow size="0.8rem" />}>
            Interface
          </Tabs.Tab>
          <Tabs.Tab
            value="storage"
            icon={
              <Indicator
                color={lightOrDark(theme, "orange", "yellow")}
                size={8}
                disabled={!isDirty}
                offset={1}
              >
                <Box mt={rem(1)}>
                  <IconDatabase size="0.8rem" />
                </Box>
              </Indicator>
            }
          >
            Storage
          </Tabs.Tab>
          <Tabs.Tab value="import-export" icon={<IconDeviceFloppy size="0.8rem" />}>
            Import / Export
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <Stack p="md">
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Blank Items</Title>
                <Text fz="xs">Allow blank items to be added to the clipboard history.</Text>
              </Stack>
              <Switch
                checked={settings.allowBlankItems}
                onChange={async (e) => {
                  const checked = e.target.checked;

                  await setSettings({ ...settings, allowBlankItems: checked });
                }}
              />
            </Group>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Sort Items By</Title>
                <Text fz="xs">Select how items are sorted.</Text>
              </Stack>
              <Select
                value={settings.sortItemsBy}
                onChange={(newValue) =>
                  newValue &&
                  setSettings({
                    ...settings,
                    sortItemsBy: ItemSortOption.parse(newValue),
                  })
                }
                data={[
                  { value: ItemSortOption.Enum.DateCreated, label: "Date Created" },
                  { value: ItemSortOption.Enum.DateLastCopied, label: "Date Last Copied" },
                ]}
                size="xs"
                withinPortal
              />
            </Group>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Group align="center" spacing="xs">
                  <Title order={6}>Default Storage Location</Title>
                  <Badge size="xs" color="cyan">
                    Pro
                  </Badge>
                </Group>
                <Text fz="xs">
                  Select where new items are stored. When offline or not subscribed to Pro, this
                  setting is ignored and new items will be stored locally.
                </Text>
              </Stack>
              <Select
                value={settings.storageLocation}
                onChange={(newStorageLocation) =>
                  newStorageLocation &&
                  setSettings({
                    ...settings,
                    storageLocation: StorageLocation.parse(newStorageLocation),
                  })
                }
                data={[
                  { value: StorageLocation.Enum.Local, label: StorageLocation.Enum.Local },
                  { value: StorageLocation.Enum.Cloud, label: StorageLocation.Enum.Cloud },
                ]}
                size="xs"
                withinPortal
                disabled={!auth.user}
              />
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="interface">
          <Stack p="md">
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Total Items Badge</Title>
                <Text fz="xs">
                  Show number of items in the clipboard history on the extension icon.
                </Text>
              </Stack>
              <Switch
                checked={settings.totalItemsBadge}
                onChange={async (e) => {
                  const checked = e.target.checked;

                  await setSettings({ ...settings, totalItemsBadge: checked });

                  await sendToBackground<
                    UpdateTotalItemsBadgeRequestBody,
                    UpdateTotalItemsBadgeResponseBody
                  >({
                    name: "updateTotalItemsBadge",
                  });
                }}
              />
            </Group>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Paste From Context Menu</Title>
                <Text fz="xs">Enable pasting clipboard history items from the context menu.</Text>
              </Stack>
              <Switch
                checked={settings.pasteFromContextMenu}
                onChange={async (e) => {
                  const checked = e.target.checked;

                  await setSettings({ ...settings, pasteFromContextMenu: checked });

                  await sendToBackground<
                    UpdateContextMenusRequestBody,
                    UpdateContextMenusResponseBody
                  >({
                    name: "updateContextMenus",
                  });
                }}
              />
            </Group>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Changelog Indicator</Title>
                <Text fz="xs">
                  Display an indicator on the changelog button if the extension was updated since
                  the changelog was last viewed.
                </Text>
              </Stack>
              <Switch
                checked={settings.changelogIndicator}
                onChange={async (e) => {
                  const checked = e.target.checked;

                  await setSettings({ ...settings, changelogIndicator: checked });
                }}
              />
            </Group>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Default Tab</Title>
                <Text fz="xs">Select the tab shown when the extension is opened.</Text>
              </Stack>
              <Select
                value={settings.defaultTab}
                onChange={(newDefaultTab) =>
                  newDefaultTab &&
                  setSettings({ ...settings, defaultTab: Tab.parse(newDefaultTab) })
                }
                data={[
                  { value: Tab.Enum.All, label: Tab.Enum.All },
                  { value: Tab.Enum.Favorites, label: Tab.Enum.Favorites },
                  { value: Tab.Enum.Cloud, label: Tab.Enum.Cloud },
                ]}
                size="xs"
                withinPortal
              />
            </Group>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Theme</Title>
                <Text fz="xs">Select the extension's color scheme.</Text>
              </Stack>
              <Select
                value={settings.themeV2}
                onChange={(theme) => theme && setSettings({ ...settings, themeV2: theme })}
                data={[
                  { value: "system", label: `System (${capitalize(systemColorScheme)})` },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
                size="xs"
                withinPortal
              />
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="storage">
          <form
            onSubmit={handleSubmit(async ({ localItemLimit, localItemCharacterLimit }) => {
              await setSettings({ ...settings, localItemLimit, localItemCharacterLimit });
              notifications.show({
                color: "green",
                title: "Success",
                message: "Changes were successfully saved.",
              });
              reset({ localItemLimit, localItemCharacterLimit });
            })}
          >
            <Stack p="md">
              <Stack spacing="xs">
                <Group align="flex-start" position="apart" noWrap>
                  <Stack spacing={0}>
                    <Title order={6}>Item Limit</Title>
                    <Text fz="xs">
                      Set the maximum number of non-favorited items that the clipboard history will
                      store.
                    </Text>
                  </Stack>
                  <Switch
                    checked={watch("localItemLimit") !== null}
                    onChange={(e) => {
                      setValue(
                        "localItemLimit",
                        e.target.checked ? settings.localItemLimit || 150 : null,
                        {
                          shouldDirty: true,
                        },
                      );
                      trigger();
                    }}
                  />
                </Group>
                <Controller
                  name="localItemLimit"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      {...field}
                      value={field.value === null ? "" : field.value}
                      onChange={(value) => field.onChange(value === "" ? 0 : value)}
                      error={errors.localItemLimit?.message}
                      disabled={field.value === null}
                      size="xs"
                    />
                  )}
                />
              </Stack>
              <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
              <Stack spacing="xs">
                <Group align="flex-start" position="apart" noWrap>
                  <Stack spacing={0}>
                    <Title order={6}>Item Character Limit</Title>
                    <Text fz="xs">
                      Set the maximum number of characters an item may have before it's ignored by
                      the clipboard monitor and not added to the clipboard history.
                    </Text>
                  </Stack>
                  <Switch
                    checked={watch("localItemCharacterLimit") !== null}
                    onChange={(e) => {
                      setValue(
                        "localItemCharacterLimit",
                        e.target.checked ? settings.localItemCharacterLimit || 25000 : null,
                        {
                          shouldDirty: true,
                        },
                      );
                      trigger();
                    }}
                  />
                </Group>
                <Controller
                  name="localItemCharacterLimit"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      {...field}
                      value={field.value === null ? "" : field.value}
                      onChange={(value) => field.onChange(value === "" ? 0 : value)}
                      error={errors.localItemCharacterLimit?.message}
                      disabled={field.value === null}
                      size="xs"
                    />
                  )}
                />
              </Stack>
              <Group align="center" position="apart">
                <Text
                  size="xs"
                  color={lightOrDark(theme, "orange", "yellow")}
                  display="flex"
                  align="center"
                >
                  {isDirty && (
                    <>
                      <IconAlertTriangle size="1.125rem" />
                      <Text ml={4}>You have unsaved changes.</Text>
                    </>
                  )}
                </Text>
                <Group align="center" spacing="xs">
                  <Button size="xs" variant="subtle" disabled={!isDirty} onClick={() => reset()}>
                    Reset
                  </Button>
                  <Button size="xs" disabled={!isDirty} type="submit">
                    Save
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="import-export">
          <Stack p="md">
            <Stack spacing="xs">
              <Stack spacing={0}>
                <Title order={6}>Import</Title>
                <Text fz="xs">
                  Select a file to import items from. Only files exported from this extension and
                  the
                  <> </>
                  <Anchor
                    href="https://chromewebstore.google.com/detail/clipboard-history-pro-bes/ajiejmhbejpdgkkigpddefnjmgcbkenk"
                    target="_blank"
                  >
                    old Clipboard History Pro
                  </Anchor>
                  <> </>
                  are supported.
                </Text>
              </Stack>
              <Group align="center" spacing="xs" noWrap>
                <FileInput
                  value={file}
                  onChange={setFile}
                  icon={<IconUpload size="0.8rem" />}
                  size="xs"
                  w="100%"
                  // https://github.com/mantinedev/mantine/issues/5401#issuecomment-1858711964
                  {...{ placeholder: "Select a file" }}
                />
                <Button
                  leftIcon={<IconFileImport size="1rem" />}
                  size="xs"
                  disabled={file === null}
                  onClick={async () => {
                    if (file !== null) {
                      try {
                        await importFile(file);

                        notifications.show({
                          color: "green",
                          title: "Success",
                          message: "Items were successfully imported from the selected file.",
                        });

                        setFile(null);
                      } catch (e) {
                        console.log(e);

                        notifications.show({
                          color: "red",
                          title: "Error",
                          message:
                            "The selected file could not be processed. Please try again with another file.",
                        });
                      }
                    }
                  }}
                >
                  Import
                </Button>
              </Group>
            </Stack>
            <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />
            <Group align="flex-start" spacing="md" position="apart" noWrap>
              <Stack spacing={0}>
                <Title order={6}>Export</Title>
                <Text fz="xs">
                  Back up or transfer your clipboard history by exporting it to a file.
                </Text>
              </Stack>
              <Button
                leftIcon={<IconFileExport size="1rem" />}
                size="xs"
                onClick={async () => {
                  const a = document.createElement("a");
                  a.href = window.URL.createObjectURL(
                    new Blob([JSON.stringify(await getClipboardHistoryIOExport())], {
                      type: "text/plain",
                    }),
                  );
                  a.download = `clipboard-history-io-export-${new Date().toISOString()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                Export
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};
