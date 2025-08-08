import {
  Box,
  CloseButton,
  Divider,
  Group,
  Paper,
  Progress,
  RingProgress,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCloud, IconDatabase, IconFileText, IconServer } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useEffect } from "react";

import { useEntries } from "~popup/contexts/EntriesContext";
import { storageUsageAtom } from "~popup/states/atoms";
import {
  entriesToStorageUsage,
  formatBytes,
  getPerformanceColor,
  getPerformanceScore,
  getPerformanceStatus,
} from "~utils/storageUsage";
import { defaultBorderColor, lightOrDark } from "~utils/sx";

export const StorageUsageModalContent = () => {
  const theme = useMantineTheme();
  const entries = useEntries();
  const [usage, setUsage] = useAtom(storageUsageAtom);

  useEffect(() => {
    entriesToStorageUsage(entries).then(setUsage);
  }, [entries]);

  return (
    <Paper p="md">
      <Group align="center" position="apart" mb="xs">
        <Title order={5}>Storage Usage</Title>
        <CloseButton onClick={() => modals.closeAll()} />
      </Group>

      <Stack spacing="md" mt="md">
        {/* Total Storage Overview - Simplified */}
        <Paper p="sm" withBorder>
          <Group position="apart">
            <Group spacing="xs">
              <ThemeIcon size="md" radius="md" variant="light" color="indigo">
                <IconDatabase size="1rem" />
              </ThemeIcon>
              <Box>
                <Text size="xs" color="dimmed">
                  Storage Used
                </Text>
                {!usage ? (
                  <Skeleton height={26} width={120} mt={2} />
                ) : (
                  <Group spacing={4}>
                    <Text size="md" weight={600}>
                      {formatBytes(usage.totalSize)}
                    </Text>
                    <Text size="sm" color="dimmed">
                      • {usage.itemCount.toLocaleString()} items
                    </Text>
                  </Group>
                )}
              </Box>
            </Group>

            {!usage ? (
              <Skeleton circle height={60} />
            ) : (
              <RingProgress
                size={60}
                thickness={6}
                sections={[
                  {
                    value: usage.totalSize && (usage.localSize / usage.totalSize) * 100,
                    color: lightOrDark(theme, "indigo.5", "indigo.7"),
                  },
                  {
                    value: usage.totalSize && (usage.cloudSize / usage.totalSize) * 100,
                    color: lightOrDark(theme, "cyan.5", "cyan.7"),
                  },
                ]}
              />
            )}
          </Group>
        </Paper>

        {/* Storage Breakdown */}
        <Group grow>
          <Paper p="sm" withBorder>
            <Group spacing="xs" mb="xs">
              <ThemeIcon size="sm" radius="md" variant="light" color="indigo">
                <IconServer size="1rem" />
              </ThemeIcon>
              <Text size="sm" weight={500}>
                Local
              </Text>
            </Group>
            {!usage ? (
              <>
                <Skeleton height={28} width={90} />
                <Skeleton height={14} width={50} mt={4} />
              </>
            ) : (
              <>
                <Text size="xl" weight={700} color={lightOrDark(theme, "indigo.6", "indigo.4")}>
                  {formatBytes(usage.localSize)}
                </Text>
                <Text size="xs" color="dimmed">
                  {usage.localItemCount.toLocaleString()} items
                </Text>
              </>
            )}
          </Paper>

          <Paper p="sm" withBorder>
            <Group spacing="xs" mb="xs">
              <ThemeIcon size="sm" radius="md" variant="light" color="cyan">
                <IconCloud size="1rem" />
              </ThemeIcon>
              <Text size="sm" weight={500}>
                Cloud
              </Text>
            </Group>
            {!usage ? (
              <>
                <Skeleton height={28} width={90} />
                <Skeleton height={14} width={50} mt={4} />
              </>
            ) : (
              <>
                <Text size="xl" weight={700} color={lightOrDark(theme, "cyan.6", "cyan.4")}>
                  {formatBytes(usage.cloudSize)}
                </Text>
                <Text size="xs" color="dimmed">
                  {usage.cloudItemCount.toLocaleString()} items
                </Text>
              </>
            )}
          </Paper>
        </Group>

        <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />

        {/* Item Statistics */}
        <Stack spacing="xs">
          <Text size="sm" weight={600}>
            Item Statistics
          </Text>
          <Group grow>
            <Paper p="xs" withBorder>
              <Group spacing={4}>
                <ThemeIcon size="xs" radius="md" variant="light" color="gray">
                  <IconFileText size="0.8rem" />
                </ThemeIcon>
                <Text size="xs" color="dimmed">
                  Average Size
                </Text>
              </Group>
              {!usage ? (
                <Skeleton height={18} width={70} />
              ) : (
                <Text size="sm" weight={600}>
                  {formatBytes(usage.averageItemSize)}
                </Text>
              )}
            </Paper>
            <Paper p="xs" withBorder>
              <Group spacing={4}>
                <ThemeIcon size="xs" radius="md" variant="light" color="gray">
                  <IconFileText size="0.8rem" />
                </ThemeIcon>
                <Text size="xs" color="dimmed">
                  Largest Item
                </Text>
              </Group>
              {!usage ? (
                <Skeleton height={18} width={70} />
              ) : (
                <Text size="sm" weight={600}>
                  {formatBytes(usage.largestItemSize)}
                </Text>
              )}
            </Paper>
          </Group>
        </Stack>

        <Divider sx={(theme) => ({ borderColor: defaultBorderColor(theme) })} />

        {/* Performance Impact */}
        <Stack spacing="xs">
          <Group position="apart">
            <Text size="sm" weight={600}>
              Performance Impact
            </Text>
            {!usage ? (
              <Skeleton height={16} width={50} />
            ) : (
              <Text size="xs" color={getPerformanceColor(usage)} weight={500}>
                {getPerformanceStatus(usage)}
              </Text>
            )}
          </Group>
          <Progress
            value={Math.min(getPerformanceScore(usage) * 100, 100)}
            size="lg"
            radius="md"
            color={usage && getPerformanceColor(usage)}
            animate
          />
          <Text size="xs" color="dimmed">
            The extension supports unlimited storage and is optimized to handle large collections
            efficiently, but performance may degrade with excessive items. Removing old entries
            helps maintain optimal speed.
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );
};
