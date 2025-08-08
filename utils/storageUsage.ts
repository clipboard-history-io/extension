import type { Entry } from "~types/entry";
import type { StorageUsage } from "~types/storageUsage";

// Performance thresholds based on actual processing time (local entries only)
const FAST_THRESHOLD = 500; // <500ms is fast (imperceptible lag)
const MODERATE_THRESHOLD = 2000; // 500-2000ms is moderate (slight lag but acceptable)
// >2000ms is slow (noticeable lag)

export const formatBytes = (bytes: number) => {
  if (bytes <= 0) {
    return "0 Bytes";
  }

  const sizeFactor = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(sizeFactor));
  const value = bytes / Math.pow(sizeFactor, i);

  return `${parseFloat(value.toFixed(2))} ${sizes[i]}`;
};

export const entriesToStorageUsage = async (entries: Entry[]): Promise<StorageUsage> => {
  const CHUNK_SIZE = 200;
  const usage = {
    localSize: 0,
    cloudSize: 0,
    localCount: 0,
    cloudCount: 0,
    largestSize: 0,
    processingTime: 0,
  };

  // Process entries in chunks to avoid blocking UI
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, Math.min(i + CHUNK_SIZE, entries.length));

    for (const entry of chunk) {
      // Time only the expensive Blob operation
      const startTime = performance.now();
      const size = new Blob([entry.content]).size;
      const elapsed = performance.now() - startTime;

      usage.largestSize = Math.max(usage.largestSize, size);

      // Entries with 36-char IDs are cloud entries (UUIDs)
      const isCloudEntry = entry.id.length === 36;

      if (isCloudEntry) {
        usage.cloudSize += size;
        usage.cloudCount++;
      } else {
        usage.localSize += size;
        usage.localCount++;
        // Only add timing for local entries since they affect local performance
        usage.processingTime += elapsed;
      }
    }

    // Yield to browser between chunks (but not after the last chunk)
    const hasMoreChunks = i + CHUNK_SIZE < entries.length;
    if (hasMoreChunks) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const totalSize = usage.localSize + usage.cloudSize;
  const totalCount = usage.localCount + usage.cloudCount;

  return {
    localSize: usage.localSize,
    cloudSize: usage.cloudSize,
    totalSize,
    itemCount: totalCount,
    localItemCount: usage.localCount,
    cloudItemCount: usage.cloudCount,
    averageItemSize: totalCount > 0 ? totalSize / totalCount : 0,
    largestItemSize: usage.largestSize,
    processingTime: usage.processingTime,
  };
};

export const getPerformanceColor = (usage: StorageUsage) => {
  if (usage.processingTime > MODERATE_THRESHOLD) {
    return "red";
  }

  if (usage.processingTime > FAST_THRESHOLD) {
    return "yellow";
  }

  return "green";
};

export const getPerformanceStatus = (usage: StorageUsage) => {
  if (usage.processingTime > MODERATE_THRESHOLD) {
    return "High";
  }

  if (usage.processingTime > FAST_THRESHOLD) {
    return "Moderate";
  }

  return "Minimal";
};

export const getPerformanceScore = (usage: StorageUsage | undefined) => {
  if (!usage) {
    return 0;
  }

  return usage.processingTime / MODERATE_THRESHOLD;
};
