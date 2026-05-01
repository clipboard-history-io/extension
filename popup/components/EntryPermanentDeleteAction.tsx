import { Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";

import { handleMutation } from "~popup/utils/mutation";
import { permanentlyDeleteEntries } from "~utils/storage";

import { CommonActionIcon } from "./CommonActionIcon";

interface Props {
  entryId: string;
}

export const EntryPermanentDeleteAction = ({ entryId }: Props) => {
  return (
    <CommonActionIcon
      onClick={(e) => {
        e.stopPropagation();
        modals.openConfirmModal({
          title: <Title order={5}>Permanently Delete Item</Title>,
          children: (
            <Text fz="xs" mb="xs">
              Are you sure you want to permanently delete this item? This cannot be undone.
            </Text>
          ),
          labels: { confirm: "Delete", cancel: "Cancel" },
          confirmProps: { color: "red", size: "xs" },
          cancelProps: { size: "xs" },
          onConfirm: handleMutation(() => permanentlyDeleteEntries([entryId])),
        });
      }}
    >
      <IconTrash size="1rem" />
    </CommonActionIcon>
  );
};
