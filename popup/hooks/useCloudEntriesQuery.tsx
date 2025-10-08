import { useAtomValue } from "jotai";

import { refreshTokenAtom } from "~popup/states/atoms";
import db from "~utils/db/react";

export const useCloudEntriesQuery = () => {
  const refreshToken = useAtomValue(refreshTokenAtom);
  const { user } = db.useAuth();

  return db.useQuery(
    refreshToken && user
      ? {
          entries: {
            $: {
              where: {
                "$user.id": user.id,
              },
            },
          },
        }
      : null,
  );
};
