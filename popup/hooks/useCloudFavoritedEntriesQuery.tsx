import { useAtomValue } from "jotai";

import { refreshTokenAtom } from "~popup/states/atoms";
import db from "~utils/db/react";

export const useCloudFavoritedEntriesQuery = () => {
  const refreshToken = useAtomValue(refreshTokenAtom);

  return db.useQuery(
    refreshToken
      ? {
          entries: {
            $: {
              where: {
                isFavorited: true,
              },
            },
          },
        }
      : null,
  );
};
