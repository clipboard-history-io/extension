import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconCreditCard,
  IconDeviceMobile,
  IconLogout,
  IconUserCircle,
  IconWorld,
} from "@tabler/icons-react";
import { useState } from "react";

import db from "~utils/db/react";
import env from "~utils/env";

export const UserActionIcon = () => {
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
          <ActionIcon variant="light" color="indigo.5">
            <IconUserCircle size="1.125rem" />
          </ActionIcon>
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
