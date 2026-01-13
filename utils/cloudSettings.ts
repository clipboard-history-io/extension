import type { InstaQLEntity } from "@instantdb/core";

import type { AppSchema } from "~instant.schema";

export const resolveCloudSettings = (cloudSettings?: InstaQLEntity<AppSchema, "settings">) => {
  return {
    cloudItemLimit:
      !cloudSettings ||
      (typeof cloudSettings.cloudItemLimit === "number" && cloudSettings.cloudItemLimit < 1)
        ? 1000
        : cloudSettings.cloudItemLimit || null,
  };
};
