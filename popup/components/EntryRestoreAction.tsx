import { IconArrowBackUp } from "@tabler/icons-react";

import { handleMutation } from "~popup/utils/mutation";
import { restoreEntries } from "~utils/storage";

import { CommonActionIcon } from "./CommonActionIcon";

interface Props {
  entryId: string;
}

export const EntryRestoreAction = ({ entryId }: Props) => {
  return (
    <CommonActionIcon onClick={handleMutation(() => restoreEntries([entryId]))}>
      <IconArrowBackUp size="1rem" />
    </CommonActionIcon>
  );
};
