export interface StorageUsage {
  localSize: number;
  cloudSize: number;
  totalSize: number;
  itemCount: number;
  localItemCount: number;
  cloudItemCount: number;
  averageItemSize: number;
  largestItemSize: number;
  processingTime: number; // Time in milliseconds to calculate storage
}
