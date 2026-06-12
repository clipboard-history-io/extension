import { Storage } from "@plasmohq/storage";

import { ClipboardSnapshot } from "~types/clipboardSnapshot";

const storage = new Storage({
  area: "local",
});

export const watchClipboardSnapshot = (cb: (clipboardSnapshot?: ClipboardSnapshot) => void) => {
  return storage.watch({
    clipboardSnapshot: (c) => {
      const parsed = ClipboardSnapshot.safeParse(c.newValue);

      cb(parsed.success ? parsed.data : undefined);
    },
  });
};

export const getClipboardSnapshot = async () => storage.get<ClipboardSnapshot>("clipboardSnapshot");

export const setClipboardSnapshot = async (clipboardSnapshot: ClipboardSnapshot) =>
  await storage.set("clipboardSnapshot", clipboardSnapshot);

export const updateClipboardSnapshot = async (content: string, canonicalContent?: string) =>
  await setClipboardSnapshot({ content, canonicalContent, updatedAt: Date.now() });
