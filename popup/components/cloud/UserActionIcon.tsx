import { ActionIcon, Indicator, Menu, Text, Tooltip, useMantineTheme } from "@mantine/core";
import {
  IconCreditCard,
  IconDeviceMobile,
  IconLogout,
  IconUserCircle,
  IconWorld,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState } from "react";

import { changelogViewedAtAtom } from "~popup/states/atoms";
import { updateChangelogViewedAt } from "~storage/changelogViewedAt";
import db from "~utils/db/react";
import env from "~utils/env";
import { lightOrDark } from "~utils/sx";
import { VERSION } from "~utils/version";

export const UserActionIcon = () => {
  const theme = useMantineTheme();
  const changelogViewedAt = useAtomValue(changelogViewedAtAtom);
  const auth = db.useAuth();
  const connectionStatus = db.useConnectionStatus();
  const [opened, setOpened] = useState(false);

  if (!auth.user || connectionStatus === "closed") {
    return null;
  }

  return (
    <Menu position="bottom-end" shadow="md" opened={opened} onChange={setOpened}>
      <Menu.Target>
        <Tooltip
          label={<Text fz="xs">{chrome.i18n.getMessage("commonProfile")}</Text>}
          disabled={opened}
        >
          <Indicator
            color={lightOrDark(theme, "red.4", "red.6")}
            size={8}
            disabled={changelogViewedAt === VERSION}
          >
            <ActionIcon variant="light" color="indigo.5" onClick={() => updateChangelogViewedAt()}>
              <IconUserCircle size="1.125rem" />
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{auth.user.email}</Menu.Label>
        <Menu.Item
          icon={<IconCreditCard size="0.8rem" />}
          component="a"
          href={`${env.BASE_URL}/checkout/${auth.user.id}`}
          target="_blank"
        >
          <Text fz="xs">Manage Subscription</Text>
        </Menu.Item>
        <Menu.Item icon={<IconLogout size="0.8rem" />} onClick={() => db.auth.signOut()}>
          <Text fz="xs">Sign Out</Text>
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          icon={<IconWorld size="0.8rem" />}
          component="a"
          href="https://app.clipboardhistory.io"
          target="_blank"
        >
          <Text fz="xs">Open Web App</Text>
        </Menu.Item>
        <Menu.Item
          icon={<IconDeviceMobile size="0.8rem" />}
          component="a"
          href="https://www.clipboardhistory.io/"
          target="_blank"
        >
          <Text fz="xs">Get Mobile App (Now Available!)</Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
