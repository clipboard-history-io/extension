import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  rem,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCheck,
  IconCloud,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconWifiOff,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";

import { CommonActionIcon } from "~popup/components/CommonActionIcon";
import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import { useEntries } from "~popup/contexts/EntriesContext";
import { useEntryIdToTags } from "~popup/contexts/EntryIdToTagsContext";
import { useSubscriptionsQuery } from "~popup/hooks/useSubscriptionsQuery";
import { searchAtom, settingsAtom } from "~popup/states/atoms";
import db from "~utils/db/react";
import { sortEntriesByOption } from "~utils/entries";
import { lightOrDark } from "~utils/sx";

export const CloudPage = () => {
  const theme = useMantineTheme();

  const search = useAtomValue(searchAtom);
  const settings = useAtomValue(settingsAtom);

  const auth = db.useAuth();
  const connectionStatus = db.useConnectionStatus();
  const entries = useEntries();
  const entryIdToTags = useEntryIdToTags();
  const subscriptionsQuery = useSubscriptionsQuery();

  if (auth.user && connectionStatus === "closed") {
    return (
      <EntryList
        noEntriesOverlay={
          <Stack align="center" spacing="xs" p="xl">
            <IconWifiOff size="1.125rem" />
            <Title order={4}>You're Offline</Title>
            <Text size="sm" w={500} align="center">
              Connect to the internet to access Clipboard History IO Pro.
            </Text>
          </Stack>
        }
        entries={[]}
      />
    );
  }

  if (!subscriptionsQuery.data?.subscriptions.length) {
    return (
      <EntryList
        noEntriesOverlay={
          <Group p="md" align="flex-start" noWrap>
            <Stack spacing={0} align="flex-start">
              <Group mb="xs">
                <IconDeviceMobile />
                <Loader variant="dots" color="dark" size="xs" />
                <IconDeviceDesktop />
                <Loader variant="dots" color="dark" size="xs" />
                <IconDeviceTablet />
              </Group>
              <Title order={4} mb={rem(8)}>
                Sync Your Clipboard History Everywhere
              </Title>
              <Text size="sm" mb={rem(8)}>
                Securely sync and manage your clipboard history across all your devices with
                Clipboard History IO Pro!
              </Text>
              <Text size="sm" mb="md">
                Get started now with a limited-time <b>1-month</b> free trial, cancellable anytime!
              </Text>
              <Button
                size="xs"
                mb={rem(4)}
                component="a"
                href={chrome.runtime.getURL("/tabs/sign-in.html")}
                target="_blank"
              >
                Get Started
              </Button>
              <Text color="dimmed" fz="xs" fs="italic">
                Your subscription helps cover cloud provider costs and supports the continued
                development and maintenance of CHIO!
              </Text>
            </Stack>
            <Card p="md" w={260} bg={lightOrDark(theme, "gray.1", "dark.7")} sx={{ flexShrink: 0 }}>
              <Stack spacing={rem(8)}>
                <Title order={5}>Pro Features</Title>
                <Group align="center" spacing={rem(8)} noWrap>
                  <IconCheck size="1rem" color={theme.fn.primaryColor()} />
                  <Text fz="sm">Cross-device syncing</Text>
                </Group>
                <Group align="center" spacing={rem(8)} noWrap>
                  <IconCheck size="1rem" color={theme.fn.primaryColor()} />
                  <Text fz="sm">Mobile-friendly web app</Text>
                </Group>
                <Group align="center" spacing={rem(8)} noWrap>
                  <IconCheck size="1rem" color={theme.fn.primaryColor()} />
                  <Text fz="sm">Feature request priority</Text>
                </Group>
                <Group align="center" spacing={rem(8)} noWrap>
                  <IconCheck size="1rem" color={theme.fn.primaryColor()} />
                  <Text fz="sm">Mobile app</Text>
                  <Badge size="xs" variant="outline" mt={rem(2)} color="teal">
                    New!
                  </Badge>
                </Group>
                <Group align="center" spacing={rem(8)} noWrap>
                  <IconCheck size="1rem" color={theme.fn.primaryColor()} />
                  <Text fz="sm">End-to-end encryption</Text>
                  <Badge size="xs" variant="outline" mt={rem(2)}>
                    Soon
                  </Badge>
                </Group>
              </Stack>
            </Card>
          </Group>
        }
        entries={[]}
      />
    );
  }

  return (
    <EntryList
      noEntriesOverlay={
        search.length === 0 ? (
          <NoEntriesOverlay
            title="You have no items stored in the cloud"
            subtitle={
              <Group align="center" spacing={0}>
                <Text>Store an item in the cloud by clicking on</Text>
                <CommonActionIcon>
                  <IconCloud size="1rem" />
                </CommonActionIcon>
              </Group>
            }
            description="Items stored in the cloud can be accessed from other devices"
          />
        ) : (
          <NoEntriesOverlay title={`No items found for "${search}"`} />
        )
      }
      entries={sortEntriesByOption(
        entries.filter(
          (entry) =>
            entry.id.length === 36 &&
            (search.length === 0 ||
              entry.content.toLowerCase().includes(search.toLowerCase()) ||
              entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase()))),
        ),
        settings.sortItemsBy,
      )}
    />
  );
};