import { z } from "zod";

import { Storage } from "@plasmohq/storage";

const storage = new Storage({
  area: "local",
});

// Do not change this without a migration.
const FLOATING_WINDOW_ID_STORAGE_KEY = "floatingWindowId";

export const getFloatingWindowId = async () => {
  return z
    .number()
    .nullable()
    .catch(null)
    .parse(await storage.get(FLOATING_WINDOW_ID_STORAGE_KEY));
};

export const setFloatingWindowId = async (windowId: number) => {
  await storage.set(FLOATING_WINDOW_ID_STORAGE_KEY, windowId);
};

export const deleteFloatingWindowId = async () => {
  await storage.remove(FLOATING_WINDOW_ID_STORAGE_KEY);
};
