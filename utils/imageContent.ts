// Image entries are regular entries whose content is a PNG data URL, so they share the same
// hashing, dedup, storage, and import/export machinery as text entries. Consumers that only make
// sense for text (search, merge, context menu paste, shortcuts, cloud sync) gate on
// isImageContent.

export const IMAGE_CONTENT_PREFIX = "data:image/png;base64,";

export const isImageContent = (content: string) => content.startsWith(IMAGE_CONTENT_PREFIX);

export const blobToImageContent = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const imageContentToBlob = (content: string) => {
  const bytes = Uint8Array.from(atob(content.slice(IMAGE_CONTENT_PREFIX.length)), (c) =>
    c.charCodeAt(0),
  );

  return new Blob([bytes], { type: "image/png" });
};

export const readImageContentFromClipboard = async () => {
  const clipboardItems = await navigator.clipboard.read();

  const clipboardItem = clipboardItems.find((clipboardItem) =>
    clipboardItem.types.includes("image/png"),
  );
  if (clipboardItem === undefined) {
    return null;
  }

  return await blobToImageContent(await clipboardItem.getType("image/png"));
};

export const formatImageContentSize = (content: string) => {
  const bytes = ((content.length - IMAGE_CONTENT_PREFIX.length) * 3) / 4;

  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
