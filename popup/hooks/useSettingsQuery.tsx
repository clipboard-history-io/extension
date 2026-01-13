import { useAtomValue } from "jotai";

import { refreshTokenAtom } from "~popup/states/atoms";
import db from "~utils/db/react";

export const useSettingsQuery = () => {
  const refreshToken = useAtomValue(refreshTokenAtom);

  return db.useQuery(
    refreshToken
      ? {
          settings: {},
        }
      : null,
  );
};
