import { useAtomValue } from "jotai";

import { refreshTokenAtom } from "~popup/states/atoms";
import db from "~utils/db/react";

export const useCloudTaggedEntriesQuery = () => {
  const refreshToken = useAtomValue(refreshTokenAtom);

  return db.useQuery(
    refreshToken
      ? {
          entries: {
            $: {
              where: {
                tags: {
                  $isNull: false,
                },
              },
            },
          },
        }
      : null,
  );
};
