import { createHash } from "crypto";
import { Loader, useMantineTheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCloud, IconCloudFilled } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useMemo } from "react";

import { useEntries } from "~popup/contexts/EntriesContext";
import { useSubscriptionsQuery } from "~popup/hooks/useSubscriptionsQuery";
import { transitioningEntryContentHashAtom } from "~popup/states/atoms";
import { handleMutation } from "~popup/utils/mutation";
import type { Entry } from "~types/entry";
import db from "~utils/db/react";
import { isImageContent } from "~utils/imageContent";
import { toggleEntryStorageLocation } from "~utils/storage";

import { CommonActionIcon } from "../CommonActionIcon";

interface Props {
  entry: Entry;
}

export const EntryCloudAction = ({ entry }: Props) => {
  const theme = useMantineTheme();
  const connectionStatus = db.useConnectionStatus();
  const subscriptionsQuery = useSubscriptionsQuery();
  const entries = useEntries();
  const [transitioningEntryContentHash, setTransitioningEntryContentHash] = useAtom(
    transitioningEntryContentHashAtom,
  );
  const contentHash = useMemo(
    () => createHash("sha256").update(entry.content).digest("hex"),
    [entry.content],
  );
  const isCloudEntry = entry.id.length === 36;

  // Image entries are local-only for now.
  if (
    isImageContent(entry.content) ||
    !subscriptionsQuery.data?.subscriptions.length ||
    connectionStatus === "closed"
  ) {
    return null;
  }

  return (
    <CommonActionIcon
      color={isCloudEntry ? theme.colors.cyan[5] : undefined}
      hoverColor={isCloudEntry ? theme.colors.cyan[5] : undefined}
      onClick={() => {
        if (entries.filter((e) => e.content === entry.content).length > 1) {
          notifications.show({
            color: "red",
            title: "Error",
            message: isCloudEntry
              ? "A copy of this item is already stored locally."
              : "A copy of this item is already stored in the cloud.",
          });

          return;
        }

        setTransitioningEntryContentHash(contentHash);

        handleMutation(() => toggleEntryStorageLocation(entry.id))();
      }}
    >
      {transitioningEntryContentHash === contentHash ? (
        <Loader size="xs" variant="dots" />
      ) : isCloudEntry ? (
        <IconCloudFilled size="1rem" />
      ) : (
        <IconCloud size="1rem" />
      )}
    </CommonActionIcon>
  );
};
